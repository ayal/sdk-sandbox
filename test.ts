const CODE = "return (async () => { try { const { items } = await wixClient.stores.products.queryProducts().find(); return items; } catch (e) { console.error(e); throw e; } })();";

const testService = async (serviceURL?: string) => {
    if (!serviceURL) {
        console.error('Service URL not provided');
        return;
    }

    // test a simple get to root:
    /*
    try {
        console.log('fetching root...', serviceURL);
        const res = await fetch(serviceURL);
        if (!res.ok) {
            console.error(`Error fetching data from service: ${serviceURL}`, res.status);
            const data = await res.text();
            console.error(data);
            return;
        }
    }
    catch (e: any) {
        console.error(`Exception while fetching data from service: ${serviceURL}`, e.message, e);
    }*/

    try {
        const res = await fetch(`${serviceURL}/eval`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.AUTHORIZATION || ''
            },
            body: JSON.stringify({
                code: CODE
            })
        });

        if (!res.ok) {
            console.error(`Error fetching data from service: ${serviceURL}`, res.status);
            const data = await res.text();
            console.error(data);
            return;
        }

        const data = await res.json();
        return data;
    }
    catch (e: any) {
        console.error(`Exception while fetching data from service: ${serviceURL}`, e.message, e);
    }
};

const runTest = async (serviceURL?: string, serviceName?: string) => {
    console.log(`Testing ${serviceName} service...`);
    console.time(`${serviceName}-service-test-time`);
    const data = await testService(serviceURL);
    console.timeEnd(`${serviceName}-service-test-time`);
    console.log(`${serviceName} service test result.`, 'success?', (data as any)?.result?.length > 0);
}

(async () => {
    // localhost bug in deno / node<20
    // https://github.com/denoland/deno/issues/17968
    // https://stackoverflow.com/questions/72390154/econnrefused-when-making-a-request-to-localhost-using-fetch-in-node-js
    // https://github.com/nodejs/undici/issues/1602
    // localhost works with node 20
    const localServiceURL = 'http://localhost:3000'; 
    // this works with node 18 as well
    // const localServiceURL = 'http://127.0.0.1:3000';
    const gcloudServiceURL = process.env.GCLOUD_SERVICE_URL;
    const denoServiceURL = process.env.DENO_SERVICE_URL;

    try {
        await runTest(localServiceURL, 'local');
        await runTest(gcloudServiceURL, 'gcloud');
        await runTest(denoServiceURL, 'deno');
    }
    catch (e) {
        console.error('Error running tests:', e);
    }
})();
