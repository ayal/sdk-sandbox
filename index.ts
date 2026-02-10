import express from 'express';
import { modules } from './modules.ts';
import { createClient } from '@wix/sdk';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

export function stringify(obj: any) {
  let cache: any[] | null = [];
  let str = JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache?.indexOf(value) !== -1) {
          // Circular reference found, discard key
          return;
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    },
    2
  );
  cache = null; // reset the cache
  return str;
}



const getErrorSerialized = (error: any) => {
  const newError = JSON.parse(stringify(error));

  let message = error.message;
  try {
    const messageObj = JSON.parse(message);
    message = messageObj.message;
  }
  catch (ex: any) { }

  newError.message = message;
  newError.details = error.details;
  delete newError.stack;

  return { ...newError, ...error, appError: true };
};

// to allow CORS in express you need to add the following middleware:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
  else {
    next();
  }
});

app.all('/', async (req, res) => {
  console.log('fetch called on root');
  res.send('Hello World! Date: 5/6/24');
});

app.all('/eval', async (req, res) => {
  console.log('sandbox: eval called', 'req.body', req.body);
  const code = req.body?.code || req.query?.code;
  const auth = req.headers?.authorization || req.query?.authorization || '';

  /*
  const originalFetch = fetch;

  const fetchProxy = async (...args: any[]) => {
    console.log('fetchProxy called', 'args', args);
    return originalFetch(args[0], args[1]);
  }

  const globalObject = globalThis || global || window;
  globalObject.fetch = fetchProxy;

  console.log('>>>>>typeof fetch', typeof fetch, typeof globalThis, typeof global, typeof window);
  */

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const logs: any[] = [];
  console.log = (...args: any[]) => {
    const isSandboxLog = typeof args[0] === 'string' && args[0]?.indexOf?.('sandbox:') !== -1;
    if (!isSandboxLog) {
      logs.push(args);
    }
    originalConsoleLog(...args);
  }
  console.error = (...args: any[]) => {
    const isSandboxLog = typeof args[0] === 'string' && args[0]?.indexOf?.('sandbox:') !== -1;
    if (!isSandboxLog) {
      logs.push(args);
    }
    originalConsoleError(...args);
  }



  try {
    const wixClient = createClient({
      auth: {
        getAuthHeaders: async () => {
          console.log('sandbox: getAuthHeaders called', 'auth', auth?.length);
          return {
            headers: {
              Authorization: auth as string || '',
            },
          };
        },
      },
      modules,
    });

    console.log('sandbox: will execute code', code);

    const evalResponse = eval(`
      (async () => {
        try {
          console.log('sandbox: executing code...');
          let innerEvalResponse = await (async () => {
            ${code};
          })();
          if (innerEvalResponse) {
            console.log('sandbox: execution result', innerEvalResponse);
            return innerEvalResponse;
          }
          else {
            console.log('sandbox: no execution result');
          }
        } catch (ex) {
          console.error('sandbox: wrapper-error', ex);
          return ex;
        }
      })();
    `);

    let info: any = 'no info';
    if (evalResponse instanceof Promise) {
      console.debug(`sandbox: executing command...`);
      info = await evalResponse;

      if (info === null || info === '') {
        info = new Error('no eval response');
      }

      if (info === undefined) {
        info = {};
      }
    }

    const infoToSend = info instanceof Error ? getErrorSerialized(info) : info;

    console.log('sandbox: infoToSend', infoToSend);

    res.json({ result: infoToSend, logs, });
  }
  catch (error: any) {
    console.error(error);
    res.status(500).json({ error: `Error: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`sandbox: App listening at http://localhost:${port}`);
});



