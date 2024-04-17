
const CODE = "return (async () => { try { const { items } = await wixClient.stores.products.queryProducts().find(); return items; } catch (e) { console.error(e); throw e; } })();";

const testService = async (serviceURL?: string) => {
    if (!serviceURL) {
        console.error('Service URL not provided');
        return;
    }

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
            const data = await res.text();
            console.error(data);
            return;
        }

        const data = await res.json();
        return data;
    }
    catch (e: any) {
        console.error(`Error fetching data from service: ${serviceURL}`, e.message);
    }
};

const runTest = async (serviceURL?: string, serviceName?: string) => {
    console.log(`Testing ${serviceName} service...`);
    console.time(`${serviceName}-service-test-time`);
    const data = await testService(serviceURL);
    console.timeEnd(`${serviceName}-service-test-time`);
    console.log(`${serviceName} service test result.`, 'success?', data?.result?.length > 0);
}

(async () => {
    const localServiceURL = 'http://localhost:3000';
    const gcloudServiceURL = process.env.GCLOUD_SERVICE_URL;
    const denoServiceURL = process.env.DENO_SERVICE_URL;

    try {
        await runTest(gcloudServiceURL, 'gcloud');
        await runTest(denoServiceURL, 'deno');
        await runTest(localServiceURL, 'local');
    }
    catch (e) {
        console.error('Error:', e);
    }
})()
