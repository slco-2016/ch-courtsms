// This is a terraform definition for an AWS configuration of clientcomm.
// See the README.md for more details on how to use this.

provider "aws" {
  region = "us-west-2"
}

provider "twilio" {
  account_sid = "${var.twilio_account_sid}"
  auth_token = "${var.twilio_auth_token}"
}

variable "deploy_base_url" {
  description = "The publicly-accessible URL base of this deploy (e.g. 'multnomah.clientcomm.org')"
}

// Specify this with an environment variable, something like:
// export TF_VAR_ssh_public_key_path=~/.ssh/clientcomm.pub
variable "ssh_public_key_path" {
  description = "The path to your SSH public key"
}

// Specify with TF_VAR_twilio_account_sid
variable "twilio_account_sid" {
  description = "Twilio SID for the account/subaccount"
}

// Specify with TF_VAR_twilio_auth_token
variable "twilio_auth_token" {
  description = "Twilio auth token for the account/subaccount"
}

variable "session_secret" {
  description = "Cookie encryption key for end users"
}

// RDS database password. Specify with TF_VAR_database_password
variable "database_password" {
  description = "Clientcomm database password"
}

// TODO: This will be determined from an RDS resource provisioned by terraform
variable "database_host" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: Do we really need gmail integration here, or can we replace this
// dependency with mailgun?
variable "gmail_password" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This can be provisioned by terraform.
variable "newrelic_key" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This can be provisioned by terraform.
variable "mailgun_api_key" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

resource "aws_vpc" "clientcomm" {
  cidr_block = "10.0.0.0/16"
}

// ////////////////////////////////////////////////////////////////////////////
// HOSTED SERVICES (TWILIO, ETC)
// ////////////////////////////////////////////////////////////////////////////
// NOTE: I had to build the terraform plugin for twilio myself due to an API
// inconsistency with terraform. Installation instructions will be difficult
// until my open issue is resolved:
// https://github.com/tulip/terraform-provider-twilio/issues/2
resource "twilio_phonenumber" "clientcomm" {
  name = "clientcomm multnomah"

  location {
    near_lat_long {
      latitude = 45.5231
      longitude = -122.6765
    }
  }

  // TODO: support fallback URLs as well, possibly with a secondary deploy URL
  // variable
  voice_url = "https://${var.deploy_base_url}/webhooks/voice"
  sms_url = "https://${var.deploy_base_url}/webhooks/sms"
}

// ////////////////////////////////////////////////////////////////////////////
// NETWORKING
// ////////////////////////////////////////////////////////////////////////////
// Create a subnet to contain our web servers
resource "aws_subnet" "clientcomm_web" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  map_public_ip_on_launch = true
  cidr_block = "10.0.1.0/24"
}

resource "aws_subnet" "clientcomm_database_primary" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  cidr_block = "10.0.2.0/24"
  availability_zone = "us-west-2a"
}

resource "aws_subnet" "clientcomm_database_replica" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  cidr_block = "10.0.3.0/24"
  availability_zone = "us-west-2b" // (must be in different AZ than primary
}

resource "aws_db_subnet_group" "clientcomm_database" {
  name = "clientcomm_production_database"
  subnet_ids = [
    "${aws_subnet.clientcomm_database_primary.id}",
    "${aws_subnet.clientcomm_database_replica.id}"
  ]
  tags = {
    Name = "clientcomm production database"
  }
}

// Allow access from the public internet to key web ports - 22, 80, 443
resource "aws_security_group" "clientcomm_allow_web" {
  name = "ClientComm Allow Web"
  description = "Allow 80/443 to our web servers"
  vpc_id = "${aws_vpc.clientcomm.id}"

  // TODO: restrict to CfA network?
  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port = 80
    to_port = 80
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 443
    to_port = 443
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  // From the Terraform docs:
  // https://www.terraform.io/docs/providers/aws/r/security_group.html
  // "By default, AWS creates an ALLOW ALL egress rule when creating a new
  // Security Group inside of a VPC. When creating a new Security Group inside
  // a VPC, Terraform will remove this default rule, and require you
  // specifically re-create it if you desire that rule."
  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "clientcomm_database" {
  name = "ClientComm Database"
  description = "Allow 22 publicly, 5432 from web servers"
  vpc_id = "${aws_vpc.clientcomm.id}"

  ingress {
    from_port = 22
    to_port = 22
    protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port = 5432
    to_port = 5432
    protocol = "tcp"
    cidr_blocks = ["${aws_subnet.clientcomm_web.cidr_block}"]
  }

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

// An internet gateway is necessary for traffic to exit the VPC.
resource "aws_internet_gateway" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  tags = {
    Name = "clientcomm"
  }
}

// A route table is necessary for the VPC to know to send traffic to the
// gateway.
resource "aws_route_table" "clientcomm" {
  vpc_id = "${aws_vpc.clientcomm.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.clientcomm.id}"
  }
}

// We must configure our subnets to use the route table rather than a
// created-by-default one that doesn't have a public route.
resource "aws_route_table_association" "clientcomm" {
  subnet_id = "${aws_subnet.clientcomm_web.id}"
  route_table_id = "${aws_route_table.clientcomm.id}"
}

// ////////////////////////////////////////////////////////////////////////////
// DATABASE
// ////////////////////////////////////////////////////////////////////////////
resource "aws_db_instance" "clientcomm" {
  name = "clientcomm"
  allocated_storage = 20 // GB
  engine = "postgres"
  instance_class = "db.t2.medium" // TODO: use a non-bursty instance type
  engine_version = "9.6.1"
  identifier = "clientcomm"
  username = "clientcomm"
  password = "${var.database_password}"
  vpc_security_group_ids = ["${aws_security_group.clientcomm_database.id}"]
  db_subnet_group_name = "${aws_db_subnet_group.clientcomm_database.name}"
}

// ////////////////////////////////////////////////////////////////////////////
// STORAGE
// ////////////////////////////////////////////////////////////////////////////
resource "aws_s3_bucket" "clientcomm" {
  bucket = "clientcomm-multnomah-attachments"
  acl = "private"
  tags = {
    Name = "Cientcomm Multnomah"
  }
}

resource "aws_iam_user" "clientcomm" {
  name = "clientcomm"
}

resource "aws_iam_user_policy" "clientcomm" {
  name = "clientcomm"
  user = "${aws_iam_user.clientcomm.name}"
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "s3:ListBucket"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${aws_s3_bucket.clientcomm.bucket}"
    },
    {
      "Action": [
        "s3:*"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${aws_s3_bucket.clientcomm.bucket}/*"
    }
  ]
}
POLICY
}

resource "aws_iam_access_key" "clientcomm" {
  user = "${aws_iam_user.clientcomm.name}"
}

// ////////////////////////////////////////////////////////////////////////////
// COMPUTE
// ////////////////////////////////////////////////////////////////////////////
// Superuser credentials for the created server.
resource "aws_key_pair" "clientcomm_deployer" {
  key_name = "clientcomm_deployer"
  public_key = "${file(var.ssh_public_key_path)}"
}

resource "aws_instance" "clientcomm_web" {
  ami = "ami-d206bdb2"
  instance_type = "t2.micro"
  subnet_id = "${aws_subnet.clientcomm_web.id}"
  vpc_security_group_ids = ["${aws_security_group.clientcomm_allow_web.id}"]
  key_name = "${aws_key_pair.clientcomm_deployer.key_name}"

  provisioner "file" {
    destination = "/home/ubuntu/clientcomm.conf"
    connection {
      user = "ubuntu"
    }
    content = <<ENV
CCENV=production
TWILIO_ACCOUNT_SID=${var.twilio_account_sid}
TWILIO_AUTH_TOKEN=${var.twilio_auth_token}
TWILIO_NUM=${twilio_phonenumber.clientcomm.phone_number}
TWILIO_OUTBOUND_CALLBACK_URL=https://${var.deploy_base_url}
# TWILIO_OUTBOUND_CALLBACK_URL_BACKUP=https://${var.deploy_base_url}
SESSION_SECRET=${var.session_secret}
LOCAL_DATABASE_USER=clientcomm
DATABASE_USER=${aws_db_instance.clientcomm.username}
DATABASE_PASSWORD=${aws_db_instance.clientcomm.password}
DATABASE_HOST=${aws_db_instance.clientcomm.address}
# TODO: see if we can remove this dependency
# GMAIL_PASSWORD=
NEWRELIC_KEY=${var.newrelic_key}
MAILGUN_API_KEY=${var.mailgun_api_key}
AWS_ACCESS_KEY_ID=${aws_iam_access_key.clientcomm.id}
AWS_SECRET_ACCESS_KEY=${aws_iam_access_key.clientcomm.secret}
S3_BUCKET_NAME=${aws_s3_bucket.clientcomm.bucket}
ENV
  }
}

// Run `terraform output web_ip` to fetch this value.
output "web_ip" {
  value = "${aws_instance.clientcomm_web.public_ip}"
}
