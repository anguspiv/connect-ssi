grunt-connect-ssi
==================
connect middleware for parsing ssi includes, when using the
grunt-contrib-connect.

## This is currently in development, and not ready for release

~~install~~
=======
*Not yet available
```bash
npm install connect-livereload --save-dev
```

use
===
note: you will need to rebuild the default connect middleware stack when adding this
to the middleware stack

If you are using [connect-livereload](https://github.com/intesso/connect-livereload)
middleware, you need to make sure that grunt-connect-ssi is ahead of
connect-livereload, otherwise, the parsed files will not include the injected
livereload script tags

## options
Options are not mandatory: `app.use(require('grunt-connect-livereload')());`
The Options have to be provided when the middleware is loaded:

e.g.:
```javascript

  app.use(require('grunt-connect-livereload')({

  }));

```

~~These are the available options with the following defaults:~~
*coming soon

```javascript
```

please see the [examples](https://github.com/intesso/connect-livereload/tree/master/examples) for the app and Grunt configuration.


## grunt example

The following example is from an actual Gruntfile that uses [grunt-contrib-connect](https://github.com/gruntjs/grunt-contrib-connect)

```javascript

```
For use as middleware in grunt simply add the following to the **top** of your array of middleware.

```javascript
  require('connect-livereload')(),
```
You can pass in options to this call if you do not want the defaults.

`dev` is simply the name of the server being used with the task `grunt connect:dev`. The other items in the `middleware` array are all functions that either are of the form `function (req, res, next)` like `checkForDownload` or return that like `mountFolder(connect, 'something')`.


credits
=======
- the connect static override via middleware was heavily based on [connect-livereload](https://github.com/intesso/connect-livereload)


~~tests~~
=====
*coming soon  
run the tests with
```
mocha
```

license
=======
[MIT License](https://github.com/anguspiv/grunt-connect-ssi/blob/master/LICENSE-MIT)
