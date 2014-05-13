/*
 * grunt-connect-ssi
 * https://github.com/anguspiv/grunt-connect-ssi
 *
 * Copyright (c) 2014 Angus Perkerson
 * Licensed under the MIT license.
 */

module.exports = function ssi(opt) {

	var path = require('path');
	var fs = require('fs');
	var URL = require('url');

	//options
	var opt = opt || {};
	var fileTypes = opt.fileTypes ||
					opt.includeList ||
					['.html', '.shtml', '.inc', '.incl'];
	var baseDir = opt.baseDir || __dirname;

	if(!Array.isArray(baseDir)) {
		baseDir = [baseDir];
	}

	//var ssiRegex = opt.ssiRegex || /<!--\#include\s+(file|virtual)=["']([^"'<>|\b]+)['"]\s+-->/gi;
	var includeRegex = opt.includeRegex || /<!--\s*\#include\s+(file|virtual)=["']([^"'<>|\b]+)['"]\s*-->/;

	var ssiRegex = new RegExp(includeRegex.source, 'gi');

	var ssiCache = {};

	var html = opt.html || _html;

	var errorMessage = opt.errorMessage !== null ? opt.errorMessage  : '[There was an error processing this include]';

	var fileEncoding = opt.encoding || 'utf8';

	/**
	 * Test the string for HTML
	 */
	function _html(str) {
		if (!str) return false;
		return /<[:_-\w\s\!\/\=\"\']+>/i.test(str);
	}

	function accept(req) {
		var ha = req.headers["accept"];
		if (!ha) {
			return false;
		}
		return (~ha.indexOf("html") || ~ha.indexOf('text'));
	}

	function leave(req) {
		var url = req.url;
		var ignored = true;
		if (!url) {
			return true;
		}
		fileTypes.forEach(function(item) {
			if (~url.indexOf(item)) {
				ignored = false;
			}
		});
		return false;
	}

	/**
	 * Generates an array of the SSI tags in the given html string
	 * @param  {string} html A string of HTML tags
	 * @return {Array}      A list of include tag objects, with their type, path, and original tag
	 */
	function getIncludes(html) {
		var matches = html.match(ssiRegex);

		var includes = [];

		if (matches) {

			matches.forEach(function(match) {
				var includeParts = includeRegex.exec(match);

				if(includeParts) {
					includes.push({
						type: includeParts[1],
						path: includeParts[2],
						original: includeParts[0],
					});
				}
			});

		}

		return includes;
	}

	/**
	 * Creates the full filepath to the include objects path
	 * @param  {object} include The include object to get the full path for
	 * @param  {string} currDir The filepath to the current working directory
	 * @return {string}         The fullpath to a include objects path,
	 *                          null if the file is not found
	 */
	function getFilePath(include, currDir) {

		var fullPath = null;

		baseDir.some(function(dir) {

			var filepath = dir;

			if(include.type.toLowerCase() === 'file' &&
				currDir) {
					filepath = path.join(dir, currDir, include.path);
				} else {
					filepath = path.join(dir, include.path);
				}

			filepath = path.normalize(filepath);

			if(fs.existsSync(filepath)) {
				fullPath = filepath;
				return true;
			}

		});

		return fullPath;
	}

	/**
	 * Creates a key string from the passed in filepath
	 * @param  {string} filePath the filepath to create the key for
	 * @return {string}          A Key string for the filepath
	 */
	function getKey(filepath) {
		var key = filepath.substring(0, filepath.lastIndexOf(path.extname(filepath)));

		return key.split(/[\\\/]+/).join('-');
	}

	/**
	 * Returns the data for a entry in the cache
	 * @param  {string} key Key for the cache entry
	 * @return {string}     The Data for the cache entry
	 */
	function getCache(key) {

		var cache = ssiCache[key];

		return cache.processed ? cache.data : cache.data.replace(ssiRegex, errorMessage);

	}

	/**
	 * Sets an entry into the cache objects
	 * @param {string} key      key for the cache entry
	 * @param {string} data     data for the cache entry
	 * @param {bool} processed  if the data has been processed yet
	 */
	function setCache(key, data, processed) {

		ssiCache[key] = {
			data:data,
			processed: (processed ? true : false)
		};
	}

	function clearCache() {
		ssiCache = {};
	}

	function getFile(filepath) {
		try {
			return fs.readFileSync(filepath, fileEncoding);
		} catch(e) {
			console.log('Could not read file: '+ filepath +'\nERROR::\n'+e.message);
			return null;
		}
	}

	function parseSSI(data, currDir) {
		currDir = currDir || '';

		var body = data instanceof Buffer ? data.toString(fileEncoding) : data;

		var includes = getIncludes(body);

		if(includes) {
			includes.forEach(function(include) {

				//Grab the new Current Directory
				var newDir = path.join(currDir, path.dirname(include.path));

				//Get the includes absolute filePath
				var filepath = getFilePath(include, currDir);

				var includeBuffer = filepath ? getFile(filepath) : null;

				var includeData = includeBuffer !== null ? parseSSI(includeBuffer, newDir) : errorMessage;

				body = body.replace(include.original.trim() , includeData);

			});
		}

		return body;
	}

	return function ssi(req, res, next) {

		if(res._ssi) {
			return next();
		}
		res._ssi = true;

		clearCache();

		var writeHead = res.writeHead;
		var write = res.write;
		var end = res.end;


		if(!accept(req) || leave(req)) {
			return next();
		}

		function restore() {
			res.writeHead = writeHead;
			res.write = write;
			res.end = end;
		}

		res.inject = res.write = function(string, encoding) {

			fileEncoding = encoding || 'utf8';

			if(string !== undefined) {
				var body = string instanceof Buffer ? string.toString(encoding) : string;

				if(getIncludes(body)) {

					var dir = path.dirname(URL.parse(req.url).pathname);

					body = parseSSI(body, dir);
				}

				restore();
				return write.call(res, body, encoding);
			}
			return true;
		};

		res.writeHead = function() {
			var headers = arguments[arguments.length - 1];

			if(headers && typeof headers === 'object') {
				for (var name in headers) {
					if(/content-length/i.test(name)) {
						delete headers[name];
					}
				}
			}

			var header = res.getHeader( 'content-length' );
			if ( header ) res.removeHeader( 'content-length' );

			writeHead.apply(res, arguments);
		};

		res.end = function(string, encoding) {
			restore();
			var result = res.inject(string, encoding);
			if (!result) return end.call(res, string, encoding);
			if (res.data !== undefined && !res._header) res.setHeader('content-length', Buffer.byteLength(res.data, encoding));
			res.end(res.data, encoding);
		};
		next();
	};
};
