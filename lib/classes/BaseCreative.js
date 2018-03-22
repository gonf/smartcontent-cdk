/**
 * DO NOT EDIT: This file is part of the smartcontent-cdk
 *
 * BaseCreative class
 */

import _get from 'lodash/get';
import _map from 'lodash/map';
import _each from 'lodash/each';
import _size from 'lodash/size';
import _head from 'lodash/head';
import _merge from 'lodash/merge';
import _assign from 'lodash/assign';
import _filter from 'lodash/filter';
import emojiRegex from 'emoji-regex';
import _upperFirst from 'lodash/upperFirst';
import _replace from 'lodash/replace';
import _toLower from 'lodash/toLower';
import _trimStart from 'lodash/trimStart';
import _drop from 'lodash/drop';
import version, {unversionEvent} from '../version';
import moment from 'moment';

export default class {

  /**
   * Constructor
   *
   * @param window
   */
  constructor(window) {
    this.window = window;

    this.logDebug('visibilityState', {state: this.window.document.visibilityState});
    this.window.document.addEventListener('visibilitychange', event => {
      this.logDebug('visibilityState changed', {newState: event.target.visibilityState});
    });

    this.fallback = this.elById('fallback');

    this._dataEvents = ['metaData', 'campaignData', 'data', 'rulesetsData'];
    this._dataReceived = {};

    this._assetList = this.creativeAssets();
    this._assetLoadCount = 0;
  }

  /**
   * Return Player JS Version.
   */
  getVersion() {
    return version;
  }

  /**
   *
   * @param event
   * @param data
   */
  receiveData(event, data) {

    event = unversionEvent(event);

    // Attempt to call handler
    this._call(event + 'Handler', [data]);

    // Attempt to call asset collation
    this._call(`_${event}CollateAssets`, [data]);

    // Set data received for event
    this._dataReceived[event] = data;

    this._fireDataReceived();
  }

  /**
   * Reset the creative.
   */
  reset() {
    this._dataReceived = {};
  }

  /**
   * Fire dataReceived if all data has been received.
   */
  _fireDataReceived() {
    if (_size(this._dataReceived) < _size(this._dataEvents)) {
      return;
    }

    this._call('dataReceived', null, true);
    this._checkAssets();
  }

  /**
   * Collates all content item active assets.
   *
   * @param data
   */
  _dataReceivedCollateAssets(data) {
    if(!data) {
      return;
    }

    let items = _map(data.data, this.itemFields);
    if (!items) {
      return;
    }

    let itemAssets = this.itemAssets();
    if (!itemAssets.length) {
      return;
    }

    items.forEach(item => {
      itemAssets.forEach(field => {
        let file = item[field.name];
        if (file) {
          this._assetList.push(_merge({file}, field));
        }
      });
    });
  }

  /**
   * Check if all assets have loaded.
   */
  _checkAssets() {
    this._assetList.forEach((asset) => {
      let assetHandler = '_check' + _upperFirst(asset.type);
      this[assetHandler](asset.file);
    });
  }

  /**
   * Check if image has loaded.
   *
   * @param file
   */
  _checkImage(file) {
    let img = new Image();
    img.onload = () => {
      this._assetLoadCount++;
      this._fireAssetsLoaded();
    };
    img.src = file;
  }

  /**
   * Check if video has loaded.
   *
   * @param file
   */
  _checkVideo(file) {
    let video = document.createElement('video');
    video.src = file;
    video.load();
    video.addEventListener('loadeddata', () => {
      this._assetLoadCount++;
      this._fireAssetsLoaded();
    }, false);
  }

  /**
   * Fire assetsLoaded event if all assets have been loaded
   */
  _fireAssetsLoaded() {
    if (this._assetLoadCount >= this._assetList.length) {
      this._call('assetsLoaded', false, true);
    }
  }

  /**
   * Attempt to call class method, warn if it doesn't exist.
   *
   * @param method
   * @param params
   * @param warn
   * @private
   */
  _call(method, params, warn) {
    if (!this[method]) {
      if (warn) {
        this._definitionWarning(method);
      }
      return;
    }

    params = params || [];

    // Call method
    this[method](...params);
  }

  /**
   *
   * @param method
   * @private
   */
  _definitionWarning(method) {
    console.log(`Method [${method}] may need to be defined in class [Creative]`);
  }

  /**
   * Called at the moment Creative is shown
   */
  start() {
    this._definitionWarning('start');
  }

  /**
   * If verification of Creative asset loading is required,
   * return a list of assets `type` and `name`.
   * Valid types are 'image' and 'video'.
   *
   * To be overridden by Creative.
   *
   * @return []
   */
  creativeAssets() {
    this._definitionWarning('creativeAssets');
    return [];
  }

  /**
   * If verification of data item asset loading is required,
   * return a list of content item asset `type` and `name`.
   * Valid types are 'image' and 'video'.
   *
   * To be overridden by Creative.
   *
   * @return []
   */
  itemAssets() {
    this._definitionWarning('itemAssets');
    return [];
  }

  /**
   * Initialise screens
   *
   * @param screens
   */
  initScreens(screens) {
    this.screens = screens;
    this.screenData = {};
    this.screenContainers = {};
    this.screens.forEach(screen => {
      this.screenData[screen] = false;
      this.screenContainers[screen] = this.elById('screen_' + screen);
    });
  }

  /**
   * Show a screen
   *
   * @param screen
   */
  showScreen(screen) {
    this._initScreen(screen);
    this._hideScreens();
    this.elShow(this.screenContainers[screen]);
    this.elHide(this.fallback);
    console.log(`[showScreen] ${screen}`);
  }

  /**
   * Hide all screens
   */
  _hideScreens() {
    _each(this.screenContainers, container => {
      this.elHide(container);
    });
  }

  /**
   * Initialise screen
   *
   * @param screen
   */
  _initScreen(screen) {
    this._call(screen + 'InitScreen');
  }

  /**
   * Return next screen to show
   */
  nextScreen() {
    return this.cycleNext('lastScreen', this.screens);
  }

  // ------------
  // DATA GETTERS
  // ------------

  /**
   * Returns meta data
   *
   * @returns {*}
   */
  dataGetMeta() {
    return _get(this._dataReceived.metaDataReceived, 'data', null);
  }

  /**
   * Returns campaign data
   *
   * @returns {*}
   */
  dataGetCampaign() {
    return _get(this._dataReceived.campaignDataReceived, 'data', null);
  }

  /**
   * Returns content items
   *
   * @returns []
   */
  dataGetItems() {
    return _get(this._dataReceived.dataReceived, 'data', null);
  }

  /**
   * Returns rulesets
   *
   * @returns []
   */
  dataGetRulesets() {
    return _get(this._dataReceived.rulesetsDataReceived, 'data', null);
  }

  /**
   * Helper to return frame specification data
   *
   * @returns mixed
   */
  getFrameSpecification(key) {
    let keyPrefix = 'specification';
    key = key ? keyPrefix + '.' + key : keyPrefix;
    return _get(this.dataGetMeta(), key);
  }

  /**
   * Helper to get frame location timezone offset in minutes
   *
   * @returns mixed
   */
  getFrameUtcOffsetMinutes() {
    let offsetSeconds = _get(this.dataGetMeta(), 'meta.location.timezone_offset');
    if (offsetSeconds !== null) {
      return offsetSeconds / 60;
    }
    return null;
  }

  /**
   * Helper to get current date and time at frame
   *
   * @returns moment, or null if invalid
   */
  getFrameCurrentDateAndTime() {
    let utcOffset = this.getFrameUtcOffsetMinutes();
    if (utcOffset !== null) {
      return moment().utcOffset(utcOffset);
    }
    return null;
  }

  /**
   * Helper to return frame tags
   *
   * @returns mixed
   */
  getFrameTags(slug) {
    return _get(this.dataGetMeta(), `tags.${slug}`);
  }

  /**
   * Helper to return frame tag
   *
   * @returns mixed
   */
  getFrameTag(slug) {
    return _head(this.getFrameTags(slug));
  }

  /**
   * Helper to get current weather information at frame
   *
   * @returns weather object
   */
  getCurrentWeatherInfo() {
    return _get(this.dataGetMeta(), `meta.weather[0]`);
  }

  /**
   * Helper to get today's weather forecast at frame
   *
   * @returns weather object
   */
  getTodaysWeatherForecast() {
    return _get(this.dataGetMeta(), `meta.weather[1]`);
  }

  /**
   * Helper to get weather forecast at frame, from tomorrow and for the next 6 days
   *
   * @returns weather object array [6]
   */
  getWeatherForecast() {
    return _drop(_get(this.dataGetMeta(), `meta.weather`), 2);
  }

  // -------
  // HELPERS
  // -------

  /**
   *
   * @param id
   * @returns {Element}
   */
  elById(id) {
    return this.window.document.getElementById(id);
  }

  /**
   *
   * @param el
   */
  elShow(el) {
    el.style.visibility = 'visible';
  }

  /**
   *
   * @param el
   */
  elHide(el) {
    el.style.visibility = 'hidden';
  }

  /**
   *  Shows campaign fallback. Assumes there's a DOM element with an id of "fallback".
   *
   * @param code
   */
  showFallback() {
  // showFallback(code) {
  // TODO: log fallback code
    this.elShow(this.fallback);
  }

  /**
   *  Hides the creative fallback. Requires a DOM element called "fallback"
   *
   */
  hideFallback() {
    this.elHide(this.fallback);
  }

  /**
   *
   * @param key
   * @param value
   */
  setLocalStorage(key, value) {
    localStorage.setItem(this.getLocalStorageKey(key), JSON.stringify(value));
  }

  /**
   *
   * @param key
   * @param defaultValue
   * @returns {*}
   */
  getLocalStorage(key, defaultValue) {
    let value = localStorage.getItem(this.getLocalStorageKey(key));
    if (value === null) {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch (e) {
    }
    return null;
  }

  /**
   * Unique key for creative on player.
   *
   * @param key
   * @returns {string}
   */
  getLocalStorageKey (key) {
    return `${btoa(this.window.location.origin + this.window.location.pathname)}.${key}`;
  }

  /**
   * Uses local storage to cycle through array.
   * Returns next array value.
   *
   * @param key
   * @param array
   * @returns {*}
   */
  cycleNext(key, array) {
    return array[this.cycleToMax(key, array.length)];
  }

  /**
   * Uses local storage to cycle through from zero up to max-1.
   * Returns next numeric key.
   *
   * @param key
   * @param max
   * @returns {number}
   */
  cycleToMax(key, max) {
    let last = this.getLocalStorage(key, -1);
    let next = (last + 1) % max;
    this.setLocalStorage(key, next);
    return next;
  }

  /**
   * Flatten content item fields.
   *
   * @param item
   * @returns {*}
   */
  itemFields(item) {
    if (!item || !item.fields) {
      return null;
    }

    let data = {};
    item.fields.forEach(field => {
      _assign(data, field);
    });

    return data;
  }

  /**
   * Filter content items by type.
   *
   * @param items
   * @param type
   */
  itemsOfType(items, type) {
    return _filter(
      items,
      (item) => {
        return item.type === type;
      }
    );
  }

  /**
   * Validates required fields for being null or empty. Ignores attributes with names as in exceptionsarray.
   *
   * @param target
   * @param exceptionsArray
   */
  validateFieldsFor(target, exceptionsArray) {
    const exceptions = exceptionsArray || []
    for (let member in target) {
      if (exceptions.indexOf(member) === -1) {
        if (target[member] === null || target[member] === '') return false;
      }
    }
    return true;
  }

  /**
   * Strip Tags and Decode Entities
   *
   * @param content
   */
  stripTagsDecodeEntities(content) {

    let element = document.createElement('div');

    if (!content || typeof content !== 'string') {
      return;
    }

    // Strip Tags
    content = content.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
      .replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');

    // Decode Entities
    element.innerHTML = content;
    content = element.textContent;
    element.textContent = '';

    return content;
  }

  /**
   * Strip standard unicode ranges used for Emojis.
   *
   * @param content
   */
  stripEmojis(content) {
    return content.replace(emojiRegex(), '');
  }

  /**
   * Validates and formats hexadecimal values to hex colours.
   *  Accepts either of: "0xffffff" "#ffffff" or "ffffff" or any of those with just 3 hexa values.
   *  Returns "#ffffff" or #fff, or null if invalid
   * @param srcColour
   */
  formatHexColour(srcColour) {
    let isValid = false;
    // remove all characters but the hex number itself
    const formattedColour = _replace(_toLower(_trimStart(srcColour,'#')),'0x','');
    // check they are all valid characters and there's 3 or 6 of them
    const reg = /^(?:[0-9a-fA-F]{3}){1,2}$/g
    isValid = reg.test(formattedColour);
    reg.lastIndex = 0;
    // add the prefix character when returning the value
    return (isValid) ? `#${formattedColour}` : null;
  }

  // -----------
  // LOG HELPERS
  // -----------

  /**
   * Log with INFO level.
   *
   * @param message
   * @param context
   */
  logInfo(message, context) {
    this.log('INFO', message, context);
  }

  /**
   * Log with WARNING level.
   *
   * @param message
   * @param context
   */
  logWarning(message, context) {
    this.log('WARNING', message, context);
  }

  /**
   * Log with DEBUG level.
   *
   * @param message
   * @param context
   */
  logDebug(message, context) {
    this.log('DEBUG', message, context);
  }

  /**
   * Log with ERROR level.
   *
   * @param message
   * @param context
   */
  logError(message, context) {
    this.log('ERROR', message, context);
  }

  /**
   * Validate log parameters and make log call.
   *
   * @param level
   * @param message
   * @param context
   */
  log(level, message, context) {

    // Trim level and message.
    let logData = this._trimForLog(level, message);
    level = logData[0];
    message = logData[1];

    // Validate log level.
    if (this._logLevels().indexOf(level) === -1) {
      this._log('WARNING', 'Invalid log level', {level});
      return;
    }

    context = this._validateLogContext(context);

    this._log(level, message, context);
  }

  /**
   * Validate log context.
   *
   * @param context
   * @returns {*}
   * @private
   */
  _validateLogContext(context) {
    if (!context) {
      return {};
    }

    let contextJson = '';
    try {
      contextJson = JSON.stringify(context);
    } catch (e) {
      this._log('WARNING', 'Malformed context');
      return {};
    }

    let contextSize = contextJson.length;
    if (contextSize > 255) {
      this._log('WARNING', 'Context too large', {contextSize});
      context = {};
    }

    return context;
  }

  /**
   * Sends log event to player.
   *
   * @param level
   * @param message
   * @param context
   * @private
   */
  _log(level, message, context) {

    message = `[CREATIVE] ${message}`;
    context = context || {};

    this.window.parent.postMessage({
      event: 'log', level, message, context
    }, '*');
  }

  /**
   * Trim each param to max length.
   *
   * @param params
   * @returns {Array}
   * @private
   */
  _trimForLog(...params) {
    return params.map(param => {
      return String(param).substr(0, 32);
    });
  }

  /**
   * Valid log levels.
   *
   * @returns {[string]}
   * @private
   */
  _logLevels() {
    return [
      'EMERGENCY',
      'ALERT',
      'CRITICAL',
      'ERROR',
      'WARNING',
      'NOTICE',
      'INFO',
      'DEBUG',
    ];
  }

}
