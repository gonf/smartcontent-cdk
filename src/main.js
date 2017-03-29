/**
 * DO NOT EDIT: This file is part of the smartcontent-cdk
 *
 * Browser entry point
 */
import Creative from './Creative.js';
import {versionEvent} from 'smartcontent-cdk/lib/version';

/**
 * Initialise Creative and Listen for events.
 * DOMContentLoaded must have fired for
 * Creative constructor to initialise.
 */
document.addEventListener('DOMContentLoaded', () => {

  const curtain = document.createElement('div');
  curtain.setAttribute('id', 'curtain');
  document.body.appendChild(curtain);

  const creative = new Creative(window, curtain);

  window.addEventListener('message', (event) => {
    switch (event.data.event) {
      case versionEvent('metaDataReceived'):
      case versionEvent('dataReceived'):
      case versionEvent('campaignDataReceived'):
      case versionEvent('rulesetsDataReceived'):
        creative.receiveData(event.data.event, event.data.data);
        break;
      case 'reset':
        creative.reset();
        break;
      case 'start':
        creative.triggerStart();
    }
  }, false);

  window.parent.postMessage({'event': 'ready'}, '*');
});
