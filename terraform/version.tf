terraform {
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.80.0"
    }
  }
  required_version = "~> 1.11"
}

provider "aws" {
  region = "us-gov-west-1"
  default_tags {
    tags = {
      "Repo"        = "tf_screen-next"
      "Provisioner" = "Terraform"
    }
  }
}
