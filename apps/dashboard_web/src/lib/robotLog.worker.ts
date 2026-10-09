import {parseRobotLog} from './robotLog';
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try { self.postMessage({log: parseRobotLog(event.data)}); }
  catch (error) { self.postMessage({error: error instanceof Error ? error.message : 'INVALID_LOG'}); }
};
