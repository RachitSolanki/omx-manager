/*---- Require ----*/
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Looper = require('./looper');


/*---- Prototype ----*/
var _this = Object.create(EventEmitter.prototype);


/*---- Members ----*/
/**
 * @description Default directory to prepend to videos
 * @default 
 * @memberof OmxManager
 */
var _videosDirectory = './';

/**
 * @description Default extension to append to videos
 * @default ' '
 * @memberof OmxManager
 */
var _videosExtension = '';

/**
 * @description Default command to spawn
 * @default 
 * @memberof OmxManager
 */
var _omxCommand = 'omxplayer';

/**
 * @description Native loop argument support ('--loop')
 * @default
 * @memberof OmxManager
 */
var _supportsMultipleNativeLoop = false;

var _currentVideos = [];
var _currentVideo = null;
var _currentArgs = {};

var _looper = null;
var _omxProcess = null;
var _paused = false;

/**
 * @private
 * @typedef {Object} OmxManager.Commands
 * @description Rapresents the default commands keys for Omxplayer
 */
var _commands = {
  'decreaseSpeed': '1',
  'increaseSpeed': '2',
  'previousAudioStream': 'j',
  'nextAudioStream': 'k',
  'previousChapter': 'i',
  'nextChapter': 'o',
  'previousSubtitleStream': 'n',
  'nextSubtitleStream': 'm',
  'toggleSubtitles': 's',
  'increaseSubtitleDelay': 'd',
  'decreaseSubtitleDelay': 'f',
  'increaseVolume': '+',
  'decreaseVolume': '-',
  'seekForward': '\x5b\x43',
  'seekBackward': '\x5b\x44',
  'seekFastForward': '\x5b\x41',
  'seekFastBackward': '\x5B\x42'
};

/*---- Private Functions ----*/
/**
 * @private
 * @function _sendAction
 * @description Sends an action (key).
 * @param key {String} - The key to send
 */
var _sendAction = function (key) {
  if (_omxProcess) {
    _omxProcess.stdin.write(key, function (err) {
      if (err) {
        // Report/Emit this error?
        // This error was never fired during my tests on Rpi
      }
    });
  }
};


/**
 * @private
 * @function _resolveVideosPath
 * @description Resolve path of videos and returns only valid and existent videos array
 * @param videos {Array} - Videos to check
 * @returns {Array} Valid videos
 */
var _resolveVideosPath = function (videos) {
  var ret = [];
  videos.forEach(function (video) {
    var realPath = path.resolve(_videosDirectory, video + _videosExtension);

    if (fs.existsSync(realPath)) {
      ret.push(realPath);
    /*} else {
      var err = { 
        error: new Error('File not found: ' + realPath),
        notFound: true
      };

      _this.emit('error', err);*/
    }
  });
  return ret;
};


/**
 * @private
 * @function _startup
 * @description Startup the player
 * @param videos {Array} - Videos to play
 * @param args {Object} - Args to use for playing
 * @param loop {Boolean} - If must loop videos
 */
var _startup = function (videos, args, loop) {
  // reset videos with only valid and existent videos
  _currentVideos = _resolveVideosPath(videos);

  _currentArgs = args;

  // We start from first video
  _currentVideo = _currentVideos[0];
  _looper = null;

  // Spawn arguments
  var argsToSpawn = [];
  for (var key in args) {
    if (args.hasOwnProperty(key) && args[key]) {
      if (key === '--loop') {
        if (_supportsMultipleNativeLoop || (_currentVideos.length === 1 && !loop)) {
          argsToSpawn.push(key);
        }
      } else {
        argsToSpawn.push(key);

        // If is an option with a value (eg.: -o hdmi), we should push also the value
        var val = args[key];
        if (typeof val === 'string') {
          argsToSpawn.push(val);
        } 
        else if (typeof val === 'number') {
          argsToSpawn.push(val.toString());
        }
      }
    }
  }

  if (_supportsMultipleNativeLoop) {
    argsToSpawn.push.apply(argsToSpawn, _currentVideos);
  } else {
    argsToSpawn.push(_currentVideo);
  }

  var respawn;
  if (!_supportsMultipleNativeLoop && (loop || _currentVideos.length > 1)) {
    _looper = Looper(_currentVideos, loop);
    // move the looper to next, we added it before
    _looper.getNext();

    respawn = function () {
      _this.emit('stop');

      // if looper is null, omx manager is stopped
      if (!_looper) {
        _this.emit('end');
        return;
      }

      var nextVideo = _looper.getNext();
      if (nextVideo) {
        // Setting current video
        _currentVideo = nextVideo;
        argsToSpawn[argsToSpawn.length - 1] = nextVideo;

        _omxProcess = spawn(_omxCommand, argsToSpawn, {
          stdio: ['pipe', null, null]
        });
        _omxProcess.once('exit', respawn);
        _this.emit('play', _currentVideo);
      } else {
        // Stop with looper null the respawn
        _looper = null;
        _this.emit('end');
      }
    };

    _omxProcess = spawn(_omxCommand, argsToSpawn, {
      stdio: ['pipe', null, null]
    });
    _omxProcess.once('exit', respawn);
  } else {
    _omxProcess = spawn(_omxCommand, argsToSpawn, {
      stdio: ['pipe', null, null]
    });
    _omxProcess.once('exit', function () {
      _omxProcess = null;
      _this.emit('stop');
      _this.emit('end');
    });
  }

  _this.emit('load', _currentVideos, _currentArgs);
  _this.emit('play', _currentVideo);
};


/*---- Public Functions ----*/
/* Functions builded inside constructor */

/**
 * @function OmxManager.decreaseSpeed
 * @description Decrease speed (sends key '1').
 */

/**
 * @function OmxManager.increaseSpeed
 * @description Increase speed (sends key '2').
 */

/**
 * @function OmxManager.previousAudioStream
 * @description Gets previous audio stream (sends key 'j').
 */

/**
 * @function OmxManager.nextAudioStream
 * @description Gets next audio stream (sends key 'k').
 */

/**
 * @function OmxManager.previousChapter
 * @description Get previous chapter (sends key 'i').
 */

/**
 * @function OmxManager.nextChapter
 * @description Get next chapter (sends key 'o').
 */

/**
 * @function OmxManager.previousSubtitleStream
 * @description Gets previous subtitle stream (sends key 'n').
 */

/**
 * @function OmxManager.nextSubtitleStream
 * @description Gets next subtitle stream (sends key 'm').
 */

/**
 * @function OmxManager.toggleSubtitles
 * @description Toggles subtitles (sends key 's').
 */

/**
 * @function OmxManager.increaseSubtitleDelay
 * @description Increase subtitle delay (sends key 'd').
 */

/**
 * @function OmxManager.decreaseSubtitleDelay
 * @description Decrease subtitle delay (sends key 'f').
 */

/**
 * @function OmxManager.increaseVolume
 * @description Increase volume (sends key '+').
 */

/**
 * @function OmxManager.decreaseVolume
 * @description Decrease volume (sends key '-').
 */

/**
 * @function OmxManager.seekForward
 * @description Seek +30 s (sends key '\x5b\x43').
 */

/**
 * @function OmxManager.seekBackward
 * @description Seek -30 s (sends key '\x5b\x44').
 */

/**
 * @function OmxManager.seekFastForward
 * @description Seek +600 s (sends key '\x5b\x41').
 */

/**
 * @function OmxManager.seekFastBackward
 * @description Seek -600 s (sends key '\x5B\x42').
 */


/**
 * @function OmxManager.stop
 * @description Stops current Omx process (sends key 'q').
 */
_this.stop = function () {
  /* ignore if process isn't running */
  if (!_omxProcess) return;

  _sendAction('q');
  // handle with timeout
  _looper = null;
  _omxProcess = null;
};


/**
 * @function OmxManager.pause
 * @description Pauses video (sends key 'p').
 */
_this.pause = function () {
  if (_paused) return;
  /* ignore if process isn't running */
  if (!_omxProcess) return;

  _sendAction('p');
  _paused = true;
  _this.emit('pause');
};


/**
 * @function OmxManager.play
 * @description Play current Omx process or play the videos with passed args (sends key 'p').<br /><b>Note:</b> videos arg will be checked for existent videos.
 * @param [videos=null] {String|Array} - Video or videos to play
 * @param [args=null] {Object} - Args to use for playing
 * @param [loop=false] {Boolean} - If must loop videos
 * @throws {TypeError} Argument "videos" must be a {String} or an {Array}
 * @throws {Error} Argument "videos" cannot be an empty {Array}
 * @throws {TypeError} Argument "args" must be an {Object}
 */
_this.play = function (videos, args, loop) {
  if (_omxProcess) {
    if (_paused) {
      _sendAction('p');
      _paused = false;
      _this.emit('play', _currentVideo);
    }
  } else {
    if (typeof videos !== 'string' && !(videos instanceof Array)) throw new TypeError('Argument "videos" must be a String or an Array!');
    if (!videos) throw new Error('Argument "videos" cannot be an empty Array!');
    if (typeof args === 'undefined') args = {};
    if (typeof args !== 'object') throw new TypeError('Argument "args" must be an object!');
    if (typeof loop === 'undefined') loop = false;

    // Convert videos string to an array for underlying startup
    if (typeof videos === 'string') {
      videos = [videos];
    }
    _startup(videos, args, loop);
  }
};


/**
 * @function OmxManager.setVideosDirectory
 * @description Sets the default videos directory.
 * @param directory {String} - The default videos directory to prepend
 * @throws {TypeError} Argument "directory" must be a {String}
 */
_this.setVideosDirectory = function (directory) {
  if (typeof directory !== 'string') throw new TypeError('Argument "directory" must be a String!');

  _videosDirectory = directory;
};


/** 
 * @function OmxManager.setVideosExtension
 * @description Sets the default videos extension (this is just an append to filename).
 * @param extension {String} - The default videos extension to append
 * @throws {TypeError} Argument "extension" must be a {String}
 */
_this.setVideosExtension = function (extension) {
  if (typeof extension !== 'string') throw new TypeError('Argument "extension" must be a String!');

  _videosExtension = extension;
};


/**
 * @function OmxManager.setOmxCommand
 * @description Sets the default omxplayer executable path.
 * @param command {String} - The default command to spawn
 * @throws {TypeError} Argument "command" must be a {String}
 */
_this.setOmxCommand = function (command) {
  if (typeof command !== 'string') throw new TypeError('Argument "command" must be a String!');

  _omxCommand = command;
};


/**
 * @function OmxManager.enableMultipleNativeLoop
 * @description Sets that omxplayer supports multiple native loop.
 */
_this.enableMultipleNativeLoop = function () {
  _supportsMultipleNativeLoop = true;
};


/**
 * @function OmxManager.isPlaying
 * @description Returns if omx manager is playing.
 * @returns {Boolean}
 */
_this.isPlaying = function () {
  return _omxProcess && !_paused;
};


/**
 * @function OmxManager.isLoaded
 * @description Returns if omx manager is loaded (already spawned).
 * @returns {Boolean}
 */
_this.isLoaded = function () {
  return _omxProcess;
};


/**
 * @typedef {Object} OmxManager.StatusObject
 * @description Current Status Object of omx manager if loaded
 * @property videos {?Array} - Current videos array
 * @property current {?String} - Current video playing
 * @property args {?Object} - Current args
 * @property playing {?Boolean} - If is playing
 * @property loaded {Boolean} - If is loaded
 */

/**
 * @function OmxManager.getStatus
 * @description Returns current status of omx manager.
 * @returns {OmxManager.StatusObject}
 */
_this.getStatus = function () {
  if (_this.isLoaded()) {
    return {
      videos: _currentVideos,
      current: _currentVideo,
      args: _currentArgs,
      playing: _this.isPlaying(),
      loaded: true
    };
  }

  return {
    loaded: false
  };
};


/** @constructor */
var OmxManager = function () {
  for (var action in _commands) {
    if (_commands.hasOwnProperty(action)) {
      (function(key) {
        _this[action] = function () {
          if (!_omxProcess) return;

          _sendAction(key);
        };
      })(_commands[action]);
    }
  }

  return _this;
};

module.exports = OmxManager();