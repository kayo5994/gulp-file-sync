'use strict';

var log = require('fancy-log'),
    PluginError = require('plugin-error'),
    fs = require('fs-extra'),
    path = require('path'),
    crc = require('crc'),
    packageInfo = require('./package.json');

var pluginDisplayName = packageInfo.name.replace('gulp-', '');

var isIgnored = function (options, stats, file) {
    if (options.ignore) {
        if (Array.isArray(options.ignore)) {
            // 为了让 ignore 参数更容易使用，ignore 参数支持传入数组
            // 如果 ignore 的文件为数组，则遍历数组元素并把每个元素封装成一个 options，然后重新调用 isIgnored
            return options.ignore.some(function (filter) {
                return isIgnored({ignore: filter}, stats, file);
            });
        } else {
            var ignoreFileType = typeof options.ignore;
            // 判断参数类型，转换为实际使用的类型
            if (ignoreFileType === 'function') {
                return options.ignore(stats, file);

            } else if (ignoreFileType === 'string') {
                return options.ignore === file;

            } else {
                // 获取匹配的文件
                var matcheFile = options.ignore.exec(file);
                return matcheFile && matcheFile.length > 0;
            }
        }
    }
    return false;
};

// 判断两个文件是否为相同的文件（即文件没有变动）
var isSameFile = function (src, dest) {
    var srcCrc = crc.crc32(fs.readFileSync(src)).toString(16),
        destCrc = crc.crc32(fs.readFileSync(dest)).toString(16);
    return srcCrc === destCrc;
};

// 移除文件
var remove = function (options, src, dest) {

    var files = fs.readdirSync(dest);
    files.forEach(function (file) {
        var fullPathSrc = path.join(src, file),
            fullPathDest = path.join(dest, file),
            statDest = fs.statSync(fullPathDest);

        if (isIgnored(options, statDest, file)) {
            return;
        }

        if (statDest.isDirectory() && !options.recursive) {
            // 不允许递归子目录
            return;
        }

        if (!fs.existsSync(fullPathSrc)) {
            options.beforeDeleteFileCallback && options.beforeDeleteFileCallback(fullPathSrc);

            // 如果一个文件不在源目录而在目标目录，则删除该文件
            fs.removeSync(fullPathDest);

            options.deleteFileCallback(fullPathSrc, fullPathDest);

        } else {
            var statSrc = fs.statSync(fullPathSrc);
            if (statSrc.isFile() !== statDest.isFile() || statSrc.isDirectory() !== statDest.isDirectory()) {
                options.beforeDeleteFileCallback && options.beforeDeleteFileCallback(fullPathSrc);

                fs.removeSync(fullPathDest);

                options.deleteFileCallback(fullPathSrc, fullPathDest);

            } else if (statDest.isDirectory()) {
                remove(options, fullPathSrc, fullPathDest);
            }
        }
    });
};

// 新增文件
var add = function (options, src, dest) {

    var files = fs.readdirSync(src);
    files.forEach(function (file) {
        var fullPathSrc = path.join(src, file),
            fullPathDest = path.join(dest, file),
            existsDest = fs.existsSync(fullPathDest),
            statSrc = fs.statSync(fullPathSrc);

        if (isIgnored(options, statSrc, file)) {
            return;
        }

        if (statSrc.isFile()) {
            if (existsDest) {
                var statDest = fs.statSync(fullPathDest);
                if (statDest.isFile()) {
                    // 源目录与目标目录都存在该文件，判断该文件是否为相同的文件（没有被修改过）
                    if (!isSameFile(fullPathSrc, fullPathDest)) {
                        // 文件不相同，即文件被修改过，则把新文件拷贝到目标目录

                        options.beforeUpdateFileCallback && options.beforeUpdateFileCallback(fullPathSrc);

                        // forece 参数为 true 表明可以操作 index.js 所在目录更上层的目录内的文件
                        fs.copySync(fullPathSrc, fullPathDest, {force: true});

                        options.updateFileCallback(fullPathSrc, fullPathDest);
                    }
                }
            } else {
                // 如果文件只存在于源目录而不在目标目录，即为新增文件，同步到目标目录

                options.beforeAddFileCallback && options.beforeAddFileCallback(fullPathSrc);

                // forece 参数为 true 表明可以操作 index.js 所在目录更上层的目录内的文件
                fs.copySync(fullPathSrc, fullPathDest, {force: true});

                options.addFileCallback(fullPathSrc, fullPathDest);
            }

        } else if (statSrc.isDirectory()) {

            if (!options.recursive) {
                // 不允许递归子目录
                return;
            }

            add(options, fullPathSrc, fullPathDest);
        }
    });
};

// 同步文件操作
var fileSync = function (src, dest, options) {
    if (typeof(src) !== 'string') {
        throw new PluginError(pluginDisplayName, 'Missing source directory or type is not a string.')
    }
    if (typeof(dest) !== 'string') {
        throw new PluginError(pluginDisplayName, 'Missing destination directory or type is not a string.')
    }

    options = options || {};

    // 是否递归所有子目录的参数的默认值
    options.recursive = (options.recursive === undefined) || options.recursive;

    // 新增文件时输出到控制台的默认 callback
    options.addFileCallback = options.addFileCallback || function (fullPathSrc, fullPathDest) {
        log('File addition synced ' + fullPathDest);
    };

    // 删除文件时输出到控制台的默认 callback
    options.deleteFileCallback = options.deleteFileCallback || function (fullPathSrc, fullPathDest) {
        log('File deletion synced ' + fullPathDest);
    };

    // 修改文件时输出到控制台的默认 callback
    options.updateFileCallback = options.updateFileCallback || function (fullPathSrc, fullPathDest) {
        log('File modification synced ' + fullPathDest);
    };

    // 检查目标目录是否存在，如果目标目录不存在则创建一个，如果目标目录不存在而直接写入文件则会 crash
    fs.ensureDirSync(dest);
    remove(options, src, dest);
    add(options, src, dest);
};

module.exports = fileSync;
