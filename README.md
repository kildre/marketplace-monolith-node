# node-example
This repository contains a basic template for deploying a node-based web application.

# Local Dev Set up
- Create a `.env` file at the root folder and copy the contents of `.env.example` into it 
- Run `docker compose up` to bring up local postgres and redis services.
- Run `npm run start` to start the local Node server.
- (optional) to connect to postgres and redis servers in IL2 from your local, you need a CA Bundle. Run `mkdir -p secrets/ca-bundle.crt` in the root folder and 
  copy the value of `volume.secret."secret-volume-ca-bundle-crt".data."ca-bundle.crt"` into the created file. Then comment out the
  "use local pg/redis" section in `.env` and uncomment the "use il2 pg/redis" section.

# Review Environment Configuration
This repository has the [DRAGON review route](https://code.cdao.us/tenant/tekton-promotion-gitlab/-/blob/main/docs/routes/dragon-review.md) configured
to run on Merge Requests as well as via the Gitlab Manual Pipeline Run UI when `REVIEW_DEPLOYMENT` is set to true. It uses a different set of values, specified in 
`chart-env/review/(values|secrets).yaml`, which deploys a tls-enabled postgres and redis instance using bitnami helm chart dependencies. The deployed postgres server 
has its own server private key (server.key) and certificate (server.crt) and we specify the CA in ca-bundle.crt with a CN of `review-bitnami-pg`.
If you would like to customize the CN, you will need to generate your own CA cert and server key and cert using the following:

```bash
# Generate the CA’s Private Key and Self-Signed Certificate
openssl genrsa -out ca-key.pem 4096
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 -out ca-bundle.crt

# Generate a Private Key and Certificate Signing Request (CSR) for Your Server
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr

# Sign the Server Certificate with Your CA
openssl x509 -req -in server.csr -CA ca-bundle.Crt -CAkey ca-key.pem -CAcreateserial -out server.crt -days 825 -sha256
```

It will prompt you for your custom CN once you execute the above script.

## First steps

- Create your application's project repository, if not done so already, in https://code.cdao.us/tenant/. You will want your GitLab project name to match the application name you use in your Helm charts and templates, as that is the default value used to publish.
- Add your project's path to the [D.R.A.G.O.N. project's CI/CD Token Access](https://code.cdao.us/tenant/tekton-promotion-gitlab/-/settings/ci_cd)
- Copy the template files to your repository.

## Running Tests

This project uses Jest for both unit and integration testing.

### Test Commands

```sh
# Run all tests with coverage
npm test

# Run only unit tests
npm run test:unit
# or
npm run unitTest

# Run only integration tests
npm run test:int
# or
npm run intTest

# Run a specific test file
npm test -- src/test/int/service/requestEndpointService.int.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests matching a pattern
npm test -- --testNamePattern="submit"
```

### Test Structure

- **Unit tests**: Located in `src/test/unit/` - Fast, isolated tests with mocked dependencies
- **Integration tests**: Located in `src/test/int/` - Full stack tests using Testcontainers with real Postgres DB

### Integration Test Notes

- Integration tests use [@testcontainers/postgresql](https://node.testcontainers.org/) to spin up isolated Postgres instances
- Tests are run serially (maxWorkers: 1) to ensure database isolation
- Each test suite gets a fresh database instance
- Reference data (roles, statuses) is seeded once per suite in `beforeAll`
- Test data is cleaned up between tests in `beforeEach`

## Platform reqs

You will need to seed the Advana wildcard TLS secret into the K8s namespace ahead of your pipeline run. Make sure to use the same namespace you define in your charts. The following commands can be used to create your namespace, and then copy the wildcard certs from the DARQ namespace once you have CLI access to the cluster:
```sh
kubectl create namespace <<NEW APP NAMESPACE>>

kubectl get secrets/advana.us-wildcard-tls -n darq -o yaml | sed 's/namespace: darq/namespace: <<NEW APP NAMESPACE>>/g' | k apply -f -
```

## Additional Config Considerations

- This template has MTLS disabled and the virtual service configured for port 80. If your app is using TLS you will want to make the following updates:

  - `chart/templates/peer-authentication.yaml`
    ```yaml
    spec:
      mtls:
        mode:
          PERMISSIVE
    ```
  - `chart/templates/virtual-service.yaml`
    ```yaml
    spec:
      http:
        - route:
            - destination:
                port:
                  number: 443
    ```

## Post-deploy configs for access through F5

You will need to make changes to two projects to make your app accessible through F5.

### [tenant-cluster](https://code.cdao.us/tenant/tenant-cluster)
The following as3 configuration provides F5 the istio app virtual service name, as well as pointing to the correct certs to use for the application (the wildcard certs you imported to your namespace already)

> If you do not have access to the `tenant-cluster` repo in GitLab, reach out to your technical lead to request access.

- Branch from `dev` with the name of your application.
- Make the necessary changes based on [this MR](https://code.cdao.us/tenant/tenant-cluster/-/merge_requests/27) and [this MR](https://code.cdao.us/tenant/tenant-cluster/-/merge_requests/28)
  > Replace instances of `node-example` with your application name.
- Create a new MR with all the above changes, and post the MR link in Slack `#adv12-adv-prs-mrs` for the platform team to review.

### networking_infrastructure
This will add a reference to F5 for the as3 configuration you defined in `tenant-cluster` above.

- Reach out to platform engineers on Slack in the `#adv12-engineering` channel.
- Request the following additions to the `networking_infrastructure` project to enable your application:

  `networking_infrastructure/ansible/roles/app_f5/files/config/SNI-iRule-Glob.conf`
  - ```
    set node_example_app "/App/Applications/node-example-app_vs"
    ```
  - ```
    "node-example.app.advana.cdao.us" {
        virtual $node_example_app
    }
    ```
  > Again, replace `node-example` with your application name. Ensure the domain name in that second entry matches the configuration of your virtual service in your chart template.

> Platform engineers can reference [this MR](https://code.cdao.us/platform/networking_infrastructure/-/merge_requests/23) to view specific changes.
