/**
 * @copyright Copyright 2016 Kevin Locke <kevin@kevinlocke.name>
 * @license MIT
 */
'use strict';

var execFile = require('child_process').execFile;
var path = require('path');
var which = require('which');

/** Options for {@link gitBranchIs}.
 *
 * @typedef {{
 *   cwd: (?string|undefined),
 *   gitDir: (?string|undefined),
 *   gitPath: (string|undefined)
 * }}
 * @property {?string=} cwd Current working directory where the branch name is
 * tested.
 * @property {?string=} gitDir Path to the repository (i.e.
 * <code>--git-dir=</code> option to <code>git</code>).
 * @property {string=} git Git binary name or path to use (default:
 * <code>'git'</code>).
 */
var GitBranchIsOptions = {
  cwd: '',
  gitDir: '',
  gitPath: 'git'
};

/** Checks that the current branch of a git repository has a given name.
 *
 * @param {string} branchName Expected name of current branch.
 * @param {?GitBranchIsOptions=} options Options.
 * @param {?function(Error, boolean=)=} callback Callback function called
 * with <code>true</code> if the current branch is <code>branchName</code>,
 * <code>false</code> if not, <code>Error</code> if it could not be determined.
 * @return {Promise|undefined} If <code>callback</code> is not given and
 * <code>global.Promise</code> is defined, a <code>Promise</code> with
 * <code>true</code> if the current branch is <code>branchName</code>,
 * <code>false</code> if not, <code>Error</code> if it could not be determined.
 */
function gitBranchIs(branchName, options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (!callback && typeof Promise === 'function') {
    return new Promise(function(resolve, reject) {
      gitBranchIs(branchName, options, function(err, result) {
        if (err) reject(err); else resolve(result);
      });
    });
  }

  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  if (options && typeof options !== 'object') {
    process.nextTick(function() {
      callback(new TypeError('options must be an Object'));
    });
    return undefined;
  }

  gitBranchIs.getBranch(options, function(err, currentBranch) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, branchName === currentBranch);
  });
}

/** Checks that the current branch of a git repository has a given name.
 *
 * @param {?GitBranchIsOptions=} options Options.
 * @param {?function(Error, string=)=} callback Callback function called
 * with the current branch name, or <code>Error</code> if it could not be
 * determined.
 * @return {Promise|undefined} If <code>callback</code> is not given and
 * <code>global.Promise</code> is defined, a <code>Promise</code> with the
 * current branch name, or <code>Error</code> if it could not be determined.
 */
gitBranchIs.getBranch = function getBranch(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = null;
  }

  if (!callback && typeof Promise === 'function') {
    return new Promise(function(resolve, reject) {
      getBranch(options, function(err, result) {
        if (err) reject(err); else resolve(result);
      });
    });
  }

  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }

  if (options && typeof options !== 'object') {
    process.nextTick(function() {
      callback(new TypeError('options must be an Object'));
    });
    return undefined;
  }

  var combinedOpts = {};
  Object.keys(GitBranchIsOptions).forEach(function(prop) {
    combinedOpts[prop] = GitBranchIsOptions[prop];
  });
  Object.keys(Object(options)).forEach(function(prop) {
    combinedOpts[prop] = options[prop];
  });

  // which does not use relative paths.  Make paths absolute.
  if (String(combinedOpts.gitPath).indexOf(path.sep) >= 0) {
    combinedOpts.gitPath = path.resolve(
        combinedOpts.cwd ? String(combinedOpts.cwd) : '',
        combinedOpts.gitPath
    );
  }

  which(combinedOpts.gitPath, function(errWhich, gitPath) {
    if (errWhich) {
      callback(errWhich);
      return;
    }

    var gitArgs = ['symbolic-ref', '--short', 'HEAD'];
    if (combinedOpts.cwd) {
      gitArgs.unshift('-C', combinedOpts.cwd);
    }
    if (combinedOpts.gitDir) {
      gitArgs.unshift('--git-dir=' + combinedOpts.gitDir);
    }

    execFile(
        gitPath,
        gitArgs,
        function(errExec, stdout, stderr) {
          if (errExec) {
            callback(errExec);
            return;
          }

          // Note:  ASCII space and control characters are forbidden in names
          // https://www.kernel.org/pub/software/scm/git/docs/git-check-ref-format.html
          callback(null, stdout.trimRight());
        }
    );
  });
};

module.exports = gitBranchIs;