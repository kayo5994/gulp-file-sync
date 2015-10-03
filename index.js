'use strict';

var through = require('through-gulp'), 
    gutil = require('gulp-util'),
    fs = require('fs-extra'),
    path = require('path'),
    crc = require('crc'),
    packageInfo = require('./package.json');

var pluginDisplayName = packageInfo.name.replace('gulp-', '');

var isIgnored = function(_options, _dir, _file) {
	if (_options.ignore) {
		if (Array.isArray(_options.ignore)) {
      // 为了让 ignore 参数更容易使用，ignore 参数支持传入数组
      // 如果 ignore 的文件为数组，则遍历数组元素并把每个元素封装成一个 options，然后重新调用 isIgnored
			return _options.ignore.some(function(_filter) {
				return isIgnored({ ignore: _filter }, _dir, _file);
			});
		} else {
			var _ignoreFileType = typeof _options.ignore;
      // 判断参数类型，转换为实际使用的类型
			if (_ignoreFileType === 'function') {
				return _options.ignore(_dir, _file);

			} else if (_ignoreFileType === 'string') {
				return _options.ignore === _file;

			} else {
				// 获取匹配的文件 
				var _matcheFile = _options.ignore.exec(_file);
				return _matcheFile && _matcheFile.length > 0;
			}
		}
	}
	return false;
};

// 判断两个文件是否为相同的文件（即文件没有变动）
var isSameFile = function(_src, _dist) {
	var _srcCrc = crc.crc32(fs.readFileSync(_src)).toString(16),
	    _distCrc = crc.crc32(fs.readFileSync(_dist)).toString(16);
	return _srcCrc === _distCrc;
};

// 移除文件
var remove = function(_options, _src, _dist) {

	var _files = fs.readdirSync(_dist);
	_files.forEach(function(_file) {
		if (isIgnored(_options, _dist, _file)) {
			return;
		}
		var _fullPathSrc = path.join(_src, _file),
		    _fullPathDist = path.join(_dist, _file),
        _statDist = fs.statSync(_fullPathDist);

    if (_statDist.isDirectory() && !_options.recursive) {
      // 不允许递归子目录
      return;
    }

		if (!fs.existsSync(_fullPathSrc)) {
      // 如果一个文件不在源目录而在目标目录，则删除该文件
			fs.deleteSync(_fullPathDist);

      _options.deleteFileCallback(_fullPathSrc, _fullPathDist);

		} else {
      var _statSrc = fs.statSync(_fullPathSrc);
			if (_statSrc.isFile() !== _statDist.isFile() || _statSrc.isDirectory() !== _statDist.isDirectory()) {
				fs.deleteSync(_fullPathDist); 

			} else if (_statDist.isDirectory()) {
				remove(_options, _fullPathSrc, _fullPathDist);
			}
		}
	} );
};

// 新增文件
var add = function(_options, _src, _dist) {

	var _files = fs.readdirSync(_src);
	_files.forEach(function(_file) {
		if (isIgnored(_options, _src, _file)) {
			return;
		}
		var _fullPathSrc = path.join(_src, _file),
		    _fullPathDist = path.join(_dist, _file),
		    _existsDist = fs.existsSync(_fullPathDist),
		    _statSrc = fs.statSync(_fullPathSrc);
		if (_statSrc.isFile()) {
			if (_existsDist) {
				var _statDist = fs.statSync(_fullPathDist);
				if (_statDist.isDirectory()) {
          // 如果在目标目录中存在一个目录与源目录中的文件同名，则删除该目录并把文件拷贝到目标目录，并且视为更新文件去处理
					fs.deleteSync(_fullPathDist);
          // forece 参数为 true 表明可以操作 index.js 所在目录更上层的目录内的文件
					fs.copySync(_fullPathSrc, _fullPathDist, { force: true });

          _options.updateFileCallback(_fullPathSrc, _fullPathDist);
				} else if (_statDist.isFile()) {
          // 源目录与目标目录都存在该文件，判断该文件是否为相同的文件（没有被修改过）
					if (!isSameFile(_fullPathSrc, _fullPathDist)) {
            // 文件不相同，即文件被修改过，则把新文件拷贝到目标目录
            // forece 参数为 true 表明可以操作 index.js 所在目录更上层的目录内的文件
						fs.copySync(_fullPathSrc, _fullPathDist, { force: true });

            _options.updateFileCallback(_fullPathSrc, _fullPathDist);
					}
				}
			} else {
        // 如果文件只存在于源目录而不在目标目录，即为新增文件，同步到目标目录
        // forece 参数为 true 表明可以操作 index.js 所在目录更上层的目录内的文件
				fs.copySync(_fullPathSrc, _fullPathDist, { force: true });

        _options.addFileCallback(_fullPathSrc, _fullPathDist);
			}

		} else if (_statSrc.isDirectory()) {

      if (!_options.recursive) {
        // 不允许递归子目录
        return;
      }

			if (!_existsDist) {
				fs.mkdirsSync(_fullPathDist);
			}
			add(_options, _fullPathSrc, _fullPathDist);
		}
	} );
};

// 同步文件操作
var fileSync = function(_src, _dist, _options) {
	_options = _options || {};

  // 是否递归所有子目录的参数的默认值
  _options.recursive = (_options.recursive === undefined) || _options.recursive; 

  // 新增文件时输出到控制台的默认 callback 
  _options.addFileCallback  = _options.addFileCallback || function(_fullPathSrc, _fullPathDist) {
    gutil.log('同步增加文件到 ' + _fullPathDist);
  };

  // 删除文件时输出到控制台的默认 callback
  _options.deleteFileCallback  = _options.deleteFileCallback || function(_fullPathSrc, _fullPathDist) {
    gutil.log('同步删除文件 ' + _fullPathDist);
  };

  // 修改文件时输出到控制台的默认 callback
  _options.updateFileCallback  = _options.updateFileCallback || function(_fullPathSrc, _fullPathDist) {
    gutil.log('同步修改文件 ' + _fullPathDist);
  };

	var func = function(_callback) {		
		if (!_src || !_dist) {
			this.emit('error', new gutil.PluginError(pluginDisplayName, 'Invalid parameter'));
			callback();
			return;
		}
		
    // 检查目标目录是否存在，如果目标目录不存在则创建一个，如果目标目录不存在而直接写入文件则会 crash
		fs.ensureDirSync(_dist);
	  remove(_options, _src, _dist);
		add(_options, _src, _dist);
		
		_callback();
	};

	return through(
		function(_file, _enc, _callback) {
			this.push(_file);
			_callback();
		},
		func
	);
};

module.exports = fileSync;
