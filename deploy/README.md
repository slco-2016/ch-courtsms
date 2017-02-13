# Clientcomm deploy configuration

The configuration in this folder will help us deploy clientcomm in a more

## credentials checklist
All credentials should be exported as environment variables.

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* `TF_VAR_ssh_public_key_path` (e.g. `~/.ssh/clientcomm`)

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
```
