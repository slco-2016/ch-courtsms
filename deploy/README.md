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
* `TF_VAR_ssh_public_key_path` (e.g. `~/.ssh/clientcomm`)
* `TF_VAR_session_secret` (generate with `openssl rand -base64 80 | tr -d '\n'`)

(TODO: Twilio, Newrelic, mailgun, gmail SMTP)

## terraform usage
Terraform will create all necessary AWS resources for a default deployment of
clientcomm. It will output a "state file" of the resources so that subsequent
invocations of terraform will know which resources it previously created.

**This file, `terraform.tfstate`, must be kept in-sync between all team members
issuing terraform commands.** The workflow for this is to-be-determined, but I
imagine it will involve Dropbox and symlinks.

```bash
brew install terraform
terraform plan
terraform apply
```

## chef usage
Chef is used on the server to install necessary packages and configuration. To
run the chef code on all the servers, use the `run-chef.sh` script in the `chef`
directory.

In order to run chef you will need some ruby libraries installed locally. These
are installed via bundler.

```ruby
cd chef
gem install bundler
bundle install

./run-chef.sh
```
