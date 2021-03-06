/* jshint -W030,-W117 */

/*
 * grunt-EmailBuilder
 * https://github.com/yargalot/Email-Builder
 *
 * Copyright (c) 2013 Steven Miller
 * Licensed under the MIT license.
 */

 // Required modules
var path    = require('path');
var os      = require('os');
var cheerio = require('cheerio');
var mailer  = require('nodemailer');
var encode  = require('./entityEncode');
var Litmus  = require('./litmus');
var Promise = require('bluebird');
var juice   = Promise.promisifyAll(require('juice2'));


function EmailBuilder(task) {
  this.task     = task;
  this.options  = task.options(EmailBuilder.Defaults);
  this.basepath = process.cwd();
  this.grunt    = this.task.grunt;
}

EmailBuilder.taskName         = 'emailBuilder';
EmailBuilder.taskDescription  = 'Compile Files';
EmailBuilder.Defaults         = {
  removeStyleTags: true,
  removeLinkTags: true
};



/**
* Remove all style and link tags by default
*
* @param {String} html 
*
* @returns {String} html that has style and link tags removed
*/

EmailBuilder.prototype.removeStyles = function(html) {
  
  var $           = cheerio.load(html);
  var linkTags    = $('link');
  var styleTags   = $('style');
  var stylesExist = (styleTags.length || linkTags.length);

  // Remove links and style tags after they've been inlined 
  if(stylesExist){
    if(this.options.removeStyleTags) {
      html = html.replace(/<\bstyle\b[\s\S]+?<\/\bstyle\b>/g, '');
    }

    if(this.options.removeLinkTags){
      html = html.replace(/<link.*stylesheet[^>]+>/g,'');
    }
  }

  return html;
};


/**
* Pull all styles from link/style tags within conditional comments and put them
* in a style tag
*
* @param {String} html 
*
* @returns {String} html that has styles inserted into the conditional comments
*/

EmailBuilder.prototype.addStylesToConditionals = function(html){

  var reConditional = /(<!--\[\s*if[^>]+>(?:<![^>]+>)?)([\s\S]+?)(<![^>]+>)/gi;
  var _self = this;
  var $, linkTags, styleTags, stylesExist, styles;

  html = html.replace(reConditional, function(match, p1, p2, p3, offset, string){

    $           = cheerio.load(p2);
    linkTags    = $('link');
    styleTags   = $('style');
    stylesExist = (styleTags.length || linkTags.length);
    styles      = stylesExist ? '\n<style type="text/css">\n' : '';
        
    styles += _self.getStyleTagContent(p2).conditionalStyles;
    styles += _self.getLinkTagContent(p2).conditionalStyles;
    
    p2 = _self.removeStyles(p2);

    styles += stylesExist ? '\n</style>\n' : '';
    
    return p1 + styles + p2 + p3;

  });

  return html;

};



/**
* Get styles from style tag
*
* @param {String} html 
*
* @returns {String} an object whose properties contain styles from data-ignore being set
* or styles within conditional comments
*/

EmailBuilder.prototype.getStyleTagContent = function(html) {
  
  var $                 = cheerio.load(html);
  var styleTags         = $('style');
  var ignoreStyles      = '';
  var conditionalStyles = '';
  var $this;

  // Grab styles from style tags with data-ignore attr
  styleTags.each(function(){
    $this = $(this);
    if($this.attr('data-ignore')){
      ignoreStyles += $this.text();
    } else {
      conditionalStyles += $this.text();
    }
  }); 

  return {
    ignoreStyles: ignoreStyles,
    conditionalStyles: conditionalStyles
  };
};



/**
* Get styles from link tag path
*
* @param {String} html 
*
* @returns {String} an object whose properties contain styles from data-ignore being set
* or styles within conditional comments
*/

EmailBuilder.prototype.getLinkTagContent = function(html) {
  
  var $                 = cheerio.load(html);
  var linkTags          = $('link');
  var _self             = this;
  var ignoreStyles      = '';
  var conditionalStyles = '';
  var $this, href, pathExists;

  // Grab styles from links with data-ignore attr
  linkTags.each(function(){
    $this      = $(this);
    href       = $this.attr('href');
    pathExists = _self.grunt.file.exists(path.resolve(process.cwd(), href));

    if(pathExists){
      if($this.attr('data-ignore')){
        ignoreStyles += _self.grunt.file.read(href); 
      } else {
        conditionalStyles += _self.grunt.file.read(href);
      }
    } 
    
  }); 

  return {
    ignoreStyles: ignoreStyles,
    conditionalStyles: conditionalStyles
  };
};



/**
* Remove any link tags whose href path does not exist and
* remove any data-ignore link/style tags
*
* @param {String} html 
*
* @returns {String} new html 
*/

EmailBuilder.prototype.cleanUpStyles = function(html) {
  var $        = cheerio.load(html);
  var linkTags = $('link');
  var styleTags = $('style');
  var _self    = this;
  var linkTag, styleTag;

  styleTags.each(function(){
    $this = $(this);
    if($this.attr('data-ignore')) {
      html = html.replace(/<\bstyle\b.*\bdata\b\-\bignore\b[\s\S]+?<\/\bstyle\b>/g, '');
    }
  });

  linkTags.each(function(){
    $this      = $(this);
    href       = $this.attr('href');
    pathExists = _self.grunt.file.exists(path.resolve(process.cwd(), href));

    if(!pathExists || $this.attr('data-ignore')){
      linkTag = new RegExp('<link.*'+ href +'[^>]+>', 'g');
      html = html.replace(linkTag, '');
    } 
    
  });

  return html;
};



/**
* Transform html to be inlined by extracting and removing any data-ignore styles  
*
* @param {String} file - src file to read 
*
* @returns {Object} ignoreStyles - styles from style tags/links that have data-ignore attribute
* @returns {Object} html - the new html with any style tags/links 
*/

EmailBuilder.prototype.transformHtml = function(file) {

  var html         = this.grunt.file.read(file);
  var $            = cheerio.load(html);
  var ignoreStyles = '';
  var _self        = this;   

  // Reset base to file path
  this.grunt.file.setBase(path.dirname(file));

  ignoreStyles += this.getStyleTagContent(html).ignoreStyles;
  ignoreStyles += this.getLinkTagContent(html).ignoreStyles;
  
  html = this.addStylesToConditionals($.html());

  // If we don't remove links whose paths do not exist then the css 
  // will not get inlined due to a bug in juice 
  html = this.cleanUpStyles(html);

  // Reset base to default
  this.grunt.file.setBase(this.basepath);
  
  return {
    ignoreStyles: ignoreStyles,
    html: html
  };

};



/**
* Inlines css using juice2 and adds the ignored styles back in after
* css has been inlined
*
* @param {String} src - src file 
* @param {String} dest - destination file
*
* @returns {Object} a promise which resolves with an object literal containing 
* the src file, destination file, and final html output
* 
*/

EmailBuilder.prototype.inlineCss = function(src, dest) {

  var slashes       = os.platform() === 'win32' ? '\\\\' : '//';
  var url           = "file:" + slashes + path.join(this.basepath, src);
  var transformHtml = this.transformHtml(src);

  this.options.url = url;
  
  return juice.juiceContentAsync(transformHtml.html, this.options)
    .bind(this)
    .then(function(html){
      
      if(transformHtml.ignoreStyles) {
        html = html.replace(/(<\/head>)/gi, '<style type="text/css">\n' + transformHtml.ignoreStyles + '\n</style>$1');  
      }
      
      if(this.options.encodeSpecialChars) { html = encode.htmlEncode(html); }

      return { 
        dest: dest,
        html: html
      };

    });
};



/**
* Write final html output to file  
*
* @param {Object} map - object map  
* @property {String} map.dest - destination file
* @property {String} map.html - final html 
*
* @returns {String} final html to be passed to next promise 
* 
*/

EmailBuilder.prototype.writeFile = function(map) {

  this.grunt.log.writeln('Writing...'.cyan);
  this.grunt.file.write(map.dest, map.html);
  this.grunt.log.writeln('File ' + map.dest.cyan + ' created.');

  return map.html;
};



/**
* Send tests to Litmus App  
*
* @param {String} html - html to be sent   
*
* @returns {String} html to be passed to next promise 
* 
*/

EmailBuilder.prototype.sendLitmus = function(html) {

  if(this.options.litmus){
    var litmus    = new Litmus(this.options.litmus);
    var date      = this.task.grunt.template.today('yyyy-mm-dd');
    var subject   = this.options.litmus.subject;
    var $         = cheerio.load(html);
    var $title    = $('title').text().trim();
    var files     = this.task.filesSrc;
    var titleDups = {};

    if( (subject === undefined) || (subject.trim().length === 0) ){
      subject = $title;
    }

    // If no subject or title then set to date
    if(subject.trim().length === 0){
      subject = date;
    }

    // Add +1 if duplicate titles exists
    if(files.length > 1){

      if(titleDups[subject] === undefined){
        titleDups[subject] = [];
      }else{
        titleDups[subject].push(html);
      }
      
      if(titleDups[subject].length){
        subject = subject + ' - ' + parseInt(titleDups[subject].length + 1, 10);
      }

    }

    return litmus.run(html, subject.trim());

  } else {
    return html;
  }

};



/**
* Send an email test  
*
* @param {String} html - html to be sent   
*
* @returns {String} html to be passed to next promise 
* 
*/

EmailBuilder.prototype.sendEmailTest = function(html) {

    if(this.options.emailTest){

      var emailTest     = this.options.emailTest;
      var transportType = emailTest.transport ? emailTest.transport.type : false;
      var transportOpts = emailTest.transport ? emailTest.transport.options : false;
      var transport     = mailer.createTransport(transportType, transportOpts);
      var mailOptions = {
        from: emailTest.email,
        to: emailTest.email,
        subject: emailTest.subject,
        text: '',
        html: html
      };

      this.grunt.log.writeln('Sending test email to ' + emailTest.email);
      
      return new Promise(function(resolve, reject){

        transport.sendMail(mailOptions, function(error, response) {
          if(error) { return reject(error); }

          if(response.statusHandler){
            response.statusHandler.once("sent", function(data){
              console.log("Message was accepted by %s", data.domain);
              resolve(html);
            });
          } else {
            console.log(response.message);
            console.log("Message was sent");
            resolve(html);
          }

        });

      }); 

    } else {
      return html;
    }

};



/**
* Run task
*
* @param {Object} grunt - grunt object   
*
* @returns {Object} a promise that resolves with final html
* 
*/

EmailBuilder.prototype.run = function() {

  var files = Promise.resolve(this.task.files);

  return files
    .bind(this)
    .map(function(fileMap){

      var srcFile  = fileMap.src[0];
      var destFile = fileMap.dest;
      
      return this.inlineCss(srcFile, destFile)
        .then(this.writeFile)
        .then(this.sendLitmus)
        .then(this.sendEmailTest);

    })
    .catch(function(err){ this.grunt.log.error(err); });
};


EmailBuilder.registerWithGrunt = function(grunt) {

  // Please see the grunt documentation for more information regarding task and
  // helper creation: https://github.com/gruntjs/grunt/blob/master/docs/toc.md

  // ==========================================================================
  // TASKS
  // ==========================================================================


  grunt.registerMultiTask(EmailBuilder.taskName, EmailBuilder.taskDescription, function() {
    this.grunt = grunt;
    var done   = this.async();
    var task   = new EmailBuilder(this);

    task.run()
      .done(done);
  });
};


module.exports = EmailBuilder;