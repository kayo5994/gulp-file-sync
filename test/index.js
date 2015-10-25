'use strict';

var fs = require('fs-extra'),
    path = require('path'),
    expect = require('chai').expect,
    fileSync = require('..');

// 相关文件目录
var srcDirectory = 'test/src',
    destDirectory = 'test/dest',
    updateDirectory = 'test/update';

describe('fileSync(src, dest, options)', function () {

  var fileSyncWithOption = function(options) {
    options.addFileCallback = function() {};
    options.deleteFileCallback = function() {};
    options.updateFileCallback = function() {};

    fileSync(srcDirectory, destDirectory, options);
  }

  // 确保目标目录存在
  fs.ensureDirSync(destDirectory);
  // 清空目标目录，准备开始测试流程
  var _clearDestDirectory = function() {
    var _destFiles = fs.readdirSync(destDirectory);
    _destFiles.forEach(function(_file) {
      var _fullPathDest = path.join(destDirectory, _file),
          _existsDest = fs.existsSync(_fullPathDest);
      
      if (_existsDest) {
        fs.removeSync(_fullPathDest);
      }
    });
  }
  _clearDestDirectory();

  // 测试参数遗漏时是否 throw
  it('throws when `src` is missing or `src` is not a string', function () {
    expect(fileSync).to.throw('Missing source directory or type is not a string.');
  });

  // 测试非递归同步 
  describe('non-recursively', function() {

    before(function() {
      fileSyncWithOption({recursive: false}); 
    });

    it('Sync directory non-recursively', function () {
      var _srcFiles = fs.readdirSync(srcDirectory);
      _srcFiles.forEach(function(_file) {
        var _filePathSrc = path.join(srcDirectory, _file),
            _statSrc = fs.statSync(_filePathSrc),
            _fullPathDest = path.join(destDirectory, _file);

        if (_statSrc.isDirectory()) {
          expect(fs.existsSync(_fullPathDest)).to.be.false;
        } else {
          expect(fs.existsSync(_fullPathDest)).to.be.true;
        }
      });
    });
  });

  // 测试递归同步 
  describe('recursively', function() {

    before(function() {
      fileSyncWithOption({recursive: true}); 
    });

    it('Sync directory recursively', function () {
      var _srcFiles = fs.readdirSync(srcDirectory);
      _srcFiles.forEach(function(_file) {
        var _filePathSrc = path.join(srcDirectory, _file),
            _statSrc = fs.statSync(_filePathSrc),
            _fullPathDest = path.join(destDirectory, _file);

        expect(fs.existsSync(_fullPathDest)).to.be.true;
      });
    });
  });

  // 测试排除文件
  var _shouldIgnoreFile = 'ignore.png';
  describe('ignore', function() {

    before(function() {
      _clearDestDirectory();
      fileSyncWithOption({ignore: _shouldIgnoreFile}); 
    });

    it('Sync directory but ignore a file', function () {
      var _srcFiles = fs.readdirSync(srcDirectory);
      _srcFiles.forEach(function(_file) {
        var _filePathSrc = path.join(srcDirectory, _file),
            _statSrc = fs.statSync(_filePathSrc),
            _fullPathDest = path.join(destDirectory, _file);

        if (_file === _shouldIgnoreFile) {
          expect(fs.existsSync(_fullPathDest)).to.be.false;
        } else {
          expect(fs.existsSync(_fullPathDest)).to.be.true;
        }
      });
    });
  });

});
