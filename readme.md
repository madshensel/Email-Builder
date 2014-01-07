# grunt-email-builder [![Build Status](https://travis-ci.org/yargalot/Email-Builder.png?branch=master)](https://travis-ci.org/yargalot/Email-Builder) [![Dependency Status](https://gemnasium.com/yargalot/Email-Builder.png)](https://gemnasium.com/yargalot/Email-Builder)

Inline css into HTML or inline css into styletags for emails. You can then send files to Litmus for testing.


## Getting Started
Install this grunt plugin next to your project's [grunt.js gruntfile][getting_started] with: `npm install grunt-email-builder`

Then add this line to your project's `grunt.js` gruntfile:

```javascript
grunt.loadNpmTasks('grunt-email-builder');
```

[grunt]: http://gruntjs.com/
[getting_started]: http://gruntjs.com/getting-started



## Documentation

Place this in your grunt file.
```javascript
 emailBuilder: {
  test :{
    files : {
      'example/test/htmlTest.html' : 'example/html/htmlTest.html'
    }
  }
}
```

Use the `data-ignore` attribute on embedded or external styles to prevent them from being inlined. Otherwise all styles will be inline. External styles with `data-ignore` will be embedded in their own `<style>` tag within the document.
```html
<!-- external styles -->      
<link rel="stylesheet" data-ignore="ignore"  href="../css/style.css"  type="text/css" />

<!-- embedded styles -->
<style data-ignore="ignore">
 /* styles here will not be inlined */
</style>
```

###Options

**options.litmus**

Type: ``Object``

Send email tests to Litmus

```javascript
litmus : {

  // Optional, defaults to title of email + yyyy-mm-dd
  subject : 'Custom subject line', 

  // Litmus username
  username : 'username',

  // Litmus password
  password : 'password',

  // Url to your Litmus account
  url : 'https://yoursite.litmus.com',

  // Email clients to test for. Find them at http://yoursite.litmus.com/emails/clients.xml
  // The <application_code> tags contain the name e.g. Gmail Chrome: <application_code> chromegmailnew </application_code>
  applications : ['gmailnew', 'hotmail', 'outlookcom', 'ol2000', 'ol2002', 'ol2003', 'ol2007', 'ol2010','ol2011', 'ol2013', 'appmail6','iphone4', 'iphone5', 'ipad3']
}
```
**options.doctype**

Type: ```Boolean``` Default: ```true```

If set to ```false```, Doctype will be stripped from dest file. 

**options.encodeSpecialChars**

Type: ```Boolean``` Default: ```false```

If set to ```true```, special characters will be encoded to their numerical value. e.g. © --> &amp;#169;


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt][grunt].

### Contributors
Thanks for helping out:
- [Jeremy Peter](https://github.com/jeremypeter)
- [Josh Gillies](https://github.com/joshgillies)

## Thanks to
[Juice](https://github.com/LearnBoost/juice) for compiling.

## Release History
- 1.1.0 Added options.doctype and options.encodeSpecialChars.
- 1.0.0 Removed data-placement attribute in place of data-ignore. Improved options.litmus to send new versions of existing tests instead of creating new test.
- 0.0.3 Inline css from style tags
- 0.0.22 Bug Fixes
- 0.0.2 Upgrade to grunt 0.4

## License
Copyright (c) 2013 Steven Miller
Licensed under the MIT license.
