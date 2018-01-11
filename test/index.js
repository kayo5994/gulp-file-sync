'use strict';

var fs = require('fs-extra'),
    path = require('path'),
    expect = require('chai').expect,
    fileSync = require('..');

// 工具方法

// 判断一个元素是否存在于某个数组中
var isElementInArray = function (targetArray, element) {
    for (var i = 0; i < targetArray.length; i += 1) {
        if (element === targetArray[i]) {
            return true;
        }
    }
    return false;
}

// 为了消除测试输出中的 Log，避免对测试输出造成影响，随便定义些内容，由于覆盖 callback
var placeHolderFunction = function () {
    var i = 1;
    i += 1;
}

// 相关文件目录
var srcDirectory = 'test/src',
    destDirectory = 'test/dest',
    updateDirectory = 'test/update';

describe('fileSync(src, dest, options)', function () {

    var fileSyncWithOption = function (source, options) {
        options = options || {};

        fileSync(source, destDirectory, options);
    }

    // 确保目标目录存在
    fs.ensureDirSync(destDirectory);
    // 清空目标目录，准备开始测试流程
    var clearDestDirectory = function () {
        var destFiles = fs.readdirSync(destDirectory);
        destFiles.forEach(function (file) {
            var fullPathDest = path.join(destDirectory, file),
                existsDest = fs.existsSync(fullPathDest);

            if (existsDest) {
                fs.removeSync(fullPathDest);
            }
        });
    }
    clearDestDirectory();

    // 测试参数遗漏时是否 throw
    it('Throws when `src` is missing or `src` is not a string', function () {
        expect(fileSync).to.throw('Missing source directory or type is not a string.');
    });

    // 测试参数遗漏时是否 throw
    it('Throws when `dest` is missing or `dest` is not a string', function () {
        expect(fileSync.bind(undefined, srcDirectory)).to.throw('Missing destination directory or type is not a string.');
    });

    // 测试非递归同步
    describe('non-recursively', function () {

        before(function () {
            fileSyncWithOption(srcDirectory, {recursive: false});
        });

        it('Sync directory non-recursively', function () {
            var srcFiles = fs.readdirSync(srcDirectory);
            srcFiles.forEach(function (file) {
                var filePathSrc = path.join(srcDirectory, file),
                    statSrc = fs.statSync(filePathSrc),
                    fullPathDest = path.join(destDirectory, file);

                if (statSrc.isDirectory()) {
                    expect(fs.existsSync(fullPathDest)).to.be.false;
                } else {
                    expect(fs.existsSync(fullPathDest)).to.be.true;
                }
            });
        });
    });

    // 测试递归同步
    describe('recursively', function () {

        before(function () {
            fileSyncWithOption(srcDirectory, {recursive: true});
        });

        it('Sync directory recursively', function () {
            var srcFiles = fs.readdirSync(srcDirectory);
            srcFiles.forEach(function (file) {
                var fullPathDest = path.join(destDirectory, file);

                expect(fs.existsSync(fullPathDest)).to.be.true;
            });
        });
    });

    // 测试排除文件
    describe('ignore', function () {

        var shouldIgnoreFile = 'ignore.png';
        describe('ignore by function', function () {
            before(function () {
                clearDestDirectory();
                fileSyncWithOption(srcDirectory, {
                    ignore: function (dir, file) {
                        return file === shouldIgnoreFile;
                    }
                });
            });

            it('Sync directory but ignore a file', function () {
                var srcFiles = fs.readdirSync(srcDirectory);
                srcFiles.forEach(function (file) {
                    var fullPathDest = path.join(destDirectory, file);

                    if (file === shouldIgnoreFile) {
                        expect(fs.existsSync(fullPathDest)).to.be.false;
                    } else {
                        expect(fs.existsSync(fullPathDest)).to.be.true;
                    }
                });
            });
        });

        var shouldIgnoreRegex = /^ignore\.png$/i;
        describe('ignore by regex', function () {
            before(function () {
                clearDestDirectory();
                fileSyncWithOption(srcDirectory, {
                    ignore: shouldIgnoreRegex
                });
            });

            it('Sync directory but ignore a file by regex', function () {
                var srcFiles = fs.readdirSync(srcDirectory);
                srcFiles.forEach(function (file) {
                    var fullPathDest = path.join(destDirectory, file);

                    if (file === shouldIgnoreFile) {
                        expect(fs.existsSync(fullPathDest)).to.be.false;
                    } else {
                        expect(fs.existsSync(fullPathDest)).to.be.true;
                    }
                });
            });
        });

        var shouldIgnoreFileList = ['ignore.png', 'ignore_other.png'];
        describe('ignore by array', function () {
            before(function () {
                clearDestDirectory();
                fileSyncWithOption(srcDirectory, {ignore: shouldIgnoreFileList});
            });

            it('Sync directory but ignore some files', function () {
                var srcFiles = fs.readdirSync(srcDirectory);
                srcFiles.forEach(function (file) {
                    var fullPathDest = path.join(destDirectory, file);

                    if (isElementInArray(shouldIgnoreFileList, file)) {
                        expect(fs.existsSync(fullPathDest)).to.be.false;
                    } else {
                        expect(fs.existsSync(fullPathDest)).to.be.true;
                    }
                });
            });
        });

    });

    // 测试更新和删除文件
    var specialDir = '/ignore.png';
    describe('update and delete', function () {

        before(function () {
            fs.mkdirSync(updateDirectory + specialDir);
            fileSyncWithOption(updateDirectory);
        });

        it('Sync directory to update and delete some files', function () {
            var destFiles = fs.readdirSync(destDirectory);
            destFiles.forEach(function (file) {
                var fullPathSrc = path.join(updateDirectory, file);

                expect(fs.existsSync(fullPathSrc)).to.be.true;
            });
        });

        after(function () {
            fs.removeSync(updateDirectory + specialDir);
        });
    });

    // 测试新增文件，并且该文件在目标文件夹有同名目录
    var specialFile = '/special';
    describe('add special file', function () {

        before(function () {
            fs.writeFileSync(updateDirectory + specialFile);
            fs.mkdirSync(destDirectory + specialFile);
            fileSyncWithOption(updateDirectory);
        });

        it('Sync directory to add files that already exists with the same name directory in target directory', function () {
            var destFiles = fs.readdirSync(destDirectory);
            destFiles.forEach(function (file) {
                var fullPathSrc = path.join(updateDirectory, file),
                    fullPathDest = path.join(destDirectory, file);

                // 验证目标目录中的文件是否存在于源目录中
                expect(fs.existsSync(fullPathSrc)).to.be.true;
                // 验证目标目录中与源目录文件同名的子目录是否被更新
                if ('/' + file.toString === specialFile) {
                    var statDest = fs.statSync(fullPathDest);
                    expect(fs.existsSync(statDest.isFile())).to.be.true;
                }
            });
        });

        after(function () {
            fs.removeSync(updateDirectory + specialFile);
            fs.removeSync(destDirectory + specialFile);
        });
    });

    // 测试回调函数
    describe('callback testing', function () {

        var addStatus = {},
            updateStatus = {},
            deleteStatus = {};

        before(function () {
            fileSync(srcDirectory, destDirectory, {
                beforeAddFileCallback: function (fullPathSrc) {
                    addStatus.before = fullPathSrc;
                },
                addFileCallback: function (fullPathSrc) {
                    addStatus.done = fullPathSrc;
                },
                updateFileCallback: function () {
                    placeHolderFunction();
                },
                deleteFileCallback: function () {
                    placeHolderFunction();
                }
            });

            fileSync(updateDirectory, destDirectory, {
                addFileCallback: function () {
                    placeHolderFunction();
                },
                beforeUpdateFileCallback: function (fullPathSrc) {
                    updateStatus.before = fullPathSrc;
                },
                beforeDeleteFileCallback: function (fullPathSrc) {
                    deleteStatus.before = fullPathSrc;
                },
                updateFileCallback: function (fullPathSrc) {
                    updateStatus.done = fullPathSrc;
                },
                deleteFileCallback: function (fullPathSrc) {
                    deleteStatus.done = fullPathSrc;
                }
            });
        });

        it('Test the callbacks of add file', function () {
            expect(addStatus).to.have.deep.property('before', addStatus.done);
        });

        it('Test the callbacks of update file', function () {
            expect(updateStatus).to.have.deep.property('before', updateStatus.done);
        });

        it('Test the callbacks of delete file', function () {
            expect(deleteStatus).to.have.deep.property('before', deleteStatus.done);
        });
    });

});
