# SDK eval app build flow

## Partial google cloud flow:
- use rancher (nerdctl) + gcloud cli
- rancher config: use "containered" / consider if you need kubernetes or not.
- run rancher from terminal otherwise there is a problem to detect `.docker/config` which you need for auth
- see Dockerfile for how docker is built, port is 3000
- steps:
1. build image: `nerdctl build --platform=linux/amd64 -t myapp .`
platform is important for mac 
2. running locally: `nerdctl run -p 49000:3000 -d myapp` (test on http://localhost:49000)
3. register: pushing to gcloud (gcloud build)
    - tag first: `nerdctl tag myapp:latest gcr.io/$PROJECT_ID/myapp:latest`
    - push: `nerdctl push gcr.io/$PROJECT_ID/myapp:latest`
    - see the registered artifact: https://console.cloud.google.com/artifacts
4. deploy image to google cloud-run:
    - might need to `gcloud auth configure-docker` for authentication
    - deploy: create new service from image:
  ```
  gcloud run deploy myapp-service \
  --image gcr.io/$PROJECT_ID/myapp:latest \
  --allow-unauthenticated \
  --region us-central1 \
  --port 3000 \
  --memory 2G
  ```
  see the new service created: https://console.cloud.google.com/run
  note the port that should fit the dockerfile, memory that should be more than default, and platform in build step if built on mac
  note the `allow-unauthenticated` is for public access to the app 
  test your service in the new url

## Full google cloud flow:

1. gcloud build (`cloudbuild.yaml`) (https://console.cloud.google.com/cloud-build/builds)
- create trigger (https://console.cloud.google.com/cloud-build/triggers)
    - create trigger
    - choose: detect config automatically for it to pick the `cloudbuild.yaml`
    - choose trigger hook (push to branch / etc..)
- gcloudn run:
 - 3rd step in `cloudbuild.yaml` is the deployment
 - might need to give the "service account" permissions according to https://cloud.google.com/build/docs/deploying-builds/deploy-cloud-run. 
 - for permissions see IAM dashboard: https://console.cloud.google.com/iam-admin/iam
- run trigger and wait for build, you will see 3 steps:
    - build
    - push: a new artifact in registry (https://console.cloud.google.com/artifacts)
    - run: a new service (https://console.cloud.google.com/run)

## Test SDK eval:
- set SERVICE_URL, can be localhost (3000 if running without docker or other port if running in docker or your service url in gcloud)
- pass authorization header for the SDK
```bash
curl '<SERVICE_URL>/eval' \
-X POST \
-H 'Content-Type: application/json' \
-H 'Authorization: XXXXXXXXXXXXXXX' \
--data-raw '{"code": "return (async () => { try { const { items } = await wixClient.stores.products.queryProducts().find(); return items; } catch (e) { console.error(e); throw e; } })();"}'
```

check gcloud billing / usage: 
https://console.cloud.google.com/billing
