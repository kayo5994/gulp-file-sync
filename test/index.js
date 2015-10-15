var gutil = require('gulp-util'),
    join = require('path').join,
    expect = require('chai').expect,
    fileSync = require('..');

describe('fileSync(src, dest, options)', function () {

  it('throws when `src` is missing or `src` is not a string', function () {
    expect(fileSync).to.throw('Missing source directory or type is not a string.');
  });

});
