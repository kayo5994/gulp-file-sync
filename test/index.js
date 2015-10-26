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

  var _fileSyncWithOption = function(_source, _options) {
    _options = _options || {};
    _options.addFileCallback = function() {};
    _options.deleteFileCallback = function() {};
    _options.updateFileCallback = function() {};

    fileSync(_source, destDirectory, _options);
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
  it('Throws when `src` is missing or `src` is not a string', function () {
    expect(fileSync).to.throw('Missing source directory or type is not a string.');
  });

  // 测试非递归同步 
  describe('non-recursively', function() {

    before(function() {
      _fileSyncWithOption(srcDirectory, {recursive: false}); 
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
      _fileSyncWithOption(srcDirectory, {recursive: true}); 
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
      _fileSyncWithOption(srcDirectory, {ignore: _shouldIgnoreFile}); 
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

  // 测试更新和删除文件
  describe('update and delete', function() {

    before(function() {
      _clearDestDirectory();
      _fileSyncWithOption(updateDirectory); 
    });

    it('Sync directory to update and delete some files', function () {
      var _destFiles = fs.readdirSync(destDirectory);
      _destFiles.forEach(function(_file) {
        var _filePathDest = path.join(destDirectory, _file),
            _statDest = fs.statSync(_filePathDest),
            _fullPathSrc = path.join(destDirectory, _file);

        expect(fs.existsSync(_fullPathSrc)).to.be.true;
      });
    });
  });

  // 测试回调函数
  describe('callback testing', function() {

    var _add = {},
        _update = {},
        _delete = {};

    before(function() {
      fileSync(srcDirectory, destDirectory, {
        beforeAddFileCallback: function(_fullPathSrc) {
          _add.before = _fullPathSrc;
        },
        addFileCallback: function(_fullPathSrc, _fullPathDist) {
          _add.done = _fullPathSrc;
        },
        updateFileCallback: function(_fullPathSrc, _fullPathDist) {},
        deleteFileCallback: function(_fullPathSrc, _fullPathDist) {}
      }); 

      fileSync(updateDirectory, destDirectory, {
        addFileCallback: function(_fullPathSrc, _fullPathDist) {},
        beforeUpdateFileCallback: function(_fullPathSrc) {
          _update.before = _fullPathSrc;
        },
        beforeDeleteFileCallback: function(_fullPathSrc) {
          _delete.before = _fullPathSrc;
        },
        updateFileCallback: function(_fullPathSrc, _fullPathDist) {
          _update.done = _fullPathSrc;
        },
        deleteFileCallback: function(_fullPathSrc, _fullPathDist) {
          _delete.done = _fullPathSrc;
        }
      });
    });

    it('Test the callbacks of add file', function () {
      expect(_add).to.have.deep.property('before', _add.done);
    });

    it('Test the callbacks of update file', function () {
      expect(_update).to.have.deep.property('before', _update.done);
    });

    it('Test the callbacks of delete file', function () {
      expect(_delete).to.have.deep.property('before', _delete.done);
    });
  });

});
