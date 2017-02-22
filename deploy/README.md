# Clientcomm deploy configuration

The configuration in this folder will help us deploy clientcomm in a
repeatable, testable, and code-reviewable manner. Using tools like Terraform
and Chef, we will (hopefully!) be able to spin up new clientcomm deploys
easily. :rocket:

## credentials checklist
All credentials should be exported as environment variables. One good way to do
this is to create a `.env` file that has a number of lines like `VAR=value`.
Then, run every command prefixed with `env $(cat .env)`.

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `TF_VAR_ssh_public_key_path` (e.g. `~/.ssh/clientcomm.pub`)
    Make sure to add the SSH private key to your SSH agent
    (`ssh-add ~/.ssh/clientcomm`) before running Terraform.
* `TF_VAR_session_secret` (generate with `openssl rand -base64 80 | tr -d '\n'`)
* `TF_VAR_twilio_account_sid`
* `TF_VAR_twilio_auth_token`
* `TF_VAR_database_password` (generate with `openssl rand -base64 24 | tr -d '\n/+='`)
* `TF_VAR_newrelic_key`
* `TF_VAR_newrelic_app_name`
* `TF_VAR_aws_ssl_certificate_arn` (see "Setting up TLS" below)
* `TF_VAR_mailgun_api_key`
* `TF_VAR_s3_bucket_name` (e.g. `clientcomm-multnomah-attachments`)

## terraform usage
Terraform will create all necessary AWS resources for a default deployment of
clientcomm. It will output a "state file" of the resources so that subsequent
invocations of terraform will know which resources it previously created.

**This file, `terraform.tfstate`, must be kept in-sync between all team members
issuing terraform commands.** The workflow for this is to-be-determined, but I
imagine it will involve Dropbox and symlinks.

```bash
# 1. install system packages:
brew install terraform jq

# 2. install a terraform plugin
wget -O- https://github.com/tdooner/terraform-provider-twilio/releases/download/0.0.3/terraform-provider-twilio_0.0.3_darwin_x86_64.tgz \
  | tar xvC /usr/local/bin
cat <<-EOF > ~/.terraformrc
providers {
  twilio = "/usr/local/bin/terraform-provider-twilio"
}
EOF

# 3. generate, or share, a root-level SSH key
ssh-keygen -f ~/.ssh/clientcomm
ssh-add ~/.ssh/clientcomm

# 4. create a .env file with all the variables required above
vim .env

# 5. run terraform!
export $(cat .env)
terraform plan
terraform apply
```

## chef usage
After terraform has created your servers, it's time to configure them with Chef.

Chef is used on the server to install necessary packages and configuration. To
run the chef code on all the servers, use the `run-chef.sh` script in the `chef`
directory.

In order to run chef you will need some ruby libraries installed locally. These
are installed via bundler.

```ruby
cd chef
gem install bundler
rbenv rehash # (if using rbenv)
bundle install

./run-chef.sh
```

## Initializing the app
After terraform has created servers and Chef has configured them, you should
have a web server and app running that returns 500's all over the place. There
is still some config to do. The app won't work until it has a database to
access!

These steps will walk you through the first-time initialization of the
database.

```bash
ssh clientcomm@$(terraform output -state ~/dev/cfa/clientcomm/deploy/terraform.tfstate -json web_ip | jq -r '.value[0]')
cd ~/clientcomm
export $(cat /etc/clientcomm.conf)
./node_modules/.bin/knex migrate:latest
./devTools/initializeDeploy.js --multnomah

# start the worker process; this should be done on one web node only
systemctl start clientcomm-worker
```

## Setting up TLS
TLS is managed by AWS's Certificate Manager feature. You will have to set this
up manually for each deployment. The approval flow for my domain was to click a
link in an email sent to the administrative contacts given in the domain's WHOIS
data.

Start the process here:
https://us-west-2.console.aws.amazon.com/acm/home

Once you get the certificate set up, grab the certificate's ARN and export it as
the `TF_VAR_aws_ssl_certificate_arn` environment variable.
