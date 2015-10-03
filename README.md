# gulp-file-sync

[![NPM version][npm-image]][npm-url]
[![Coveralls Status][coveralls-image]][coveralls-url]
[![Dependency Status][david-dm-image]][david-dm-url]
[![Downloads][downloads-image]][npm-url]

[npm-url]:         https://npmjs.org/package/gulp-file-sync
[npm-image]:       https://img.shields.io/npm/v/gulp-file-sync.svg
[coveralls-url]:   https://coveralls.io/r/kayo5994/gulp-file-sync
[coveralls-image]: https://img.shields.io/coveralls/kayo5994/gulp-file-sync/master.svg
[david-dm-url]:    https://david-dm.org/kayo5994/gulp-file-sync
[david-dm-image]:  https://img.shields.io/david/kayo5994/gulp-file-sync.svg
[downloads-image]: https://img.shields.io/npm/dm/gulp-file-sync.svg

> Sync file It keeps your files synced between two directory. In other words, any change of files in one directory will automatically take place in another one.

## Installation

```shell
npm install --save-dev gulp-file-sync
```

## Usage

```js
var gulp = require('gulp'),
    dirSync = require('gulp-file-sync');

gulp.task('sync', function() {
  gulp.watch(['src/*.*'], function() {
    return gulp.src('')
               .pipe(dirSync('src', 'dist', { recursive: false} ))
               .on('error', function(event) {
                 console.log('Error is ' + event.error);
               });
  });
});
```
