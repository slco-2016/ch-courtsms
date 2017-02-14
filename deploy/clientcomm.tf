// This is a terraform definition for an AWS configuration of clientcomm.
// See the README.md for more details on how to use this.

provider "aws" {
  region = "us-west-2"
}

// Specify this with an environment variable, something like:
// export TF_VAR_ssh_public_key_path=~/.ssh/clientcomm.pub
variable "ssh_public_key_path" {
  description = "The path to your SSH public key"
}

// TODO: This will probably have to come from the deployer's local environment.
variable "twilio_account_sid" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This will probably have to come from the deployer's local environment.
variable "twilio_auth_token" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This can probably be provisioned with terraform.
variable "twilio_num" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: I think this is a constant, or at least derived from the hostname of
// the deploy.
variable "twilio_outbound_callback_url" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: I think this is a constant, or at least derived from the hostname of
// the deploy.
variable "twilio_outbound_callback_url_backup" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This will have to come from the deployer's local environment and it
// will be shared amongst all deployers of the app.
variable "session_secret" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This will be determined from an RDS resource provisioned by terraform
variable "database_user" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
}

// TODO: This will be determined from an RDS resource provisioned by terraform
variable "database_password" {
  description = ""
  default = "TODO ******TODO ******TODO *******"
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
// NETWORKING
// ////////////////////////////////////////////////////////////////////////////
// Create a subnet to contain our web servers
resource "aws_subnet" "clientcomm_web" {
  vpc_id = "${aws_vpc.clientcomm.id}"
  map_public_ip_on_launch = true
  cidr_block = "10.0.1.0/24"
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
TWILIO_NUM=${var.twilio_num}
TWILIO_OUTBOUND_CALLBACK_URL=${var.twilio_outbound_callback_url}
TWILIO_OUTBOUND_CALLBACK_URL_BACKUP=${var.twilio_outbound_callback_url_backup}
SESSION_SECRET=${var.session_secret}
LOCAL_DATABASE_USER=clientcomm
# TODO: replace these with RDS:
DATABASE_USER=${var.database_user}
DATABASE_PASSWORD=${var.database_password}
DATABASE_HOST=${var.database_host}
GMAIL_PASSWORD=${var.gmail_password}
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

// TODO: Get this working by maybe manually building the provider
// resource "twilio_phonenumber" "clientcomm" {
//   location {
//     near_lat_long {
//       latitude = 45.5231
//       longitude = -122.6765
//     }
//   }
// }
