locals {
  subnet_cidr_blocks = concat(
    [for subnet in data.aws_subnet.app : subnet.cidr_block],
    var.additional_cidrs
  )

}

data "aws_vpc" "tenant" {
  filter {
    name   = "tag:Name"
    values = [var.vpc_name]
  }
}

data "aws_subnets" "db" {
  filter {
    name   = "tag:Name"
    values = ["${var.vpc_name} db-*"]
  }
}

data "aws_subnets" "app" {
  filter {
    name   = "tag:Name"
    values = ["${var.vpc_name} app-*"]
  }
}

data "aws_subnet" "app" {
  for_each = toset(data.aws_subnets.app.ids)
  id       = each.value
}

resource "random_password" "master_password" {
  length = 28
  special = false
}

module "marketplace_db" {

  source  = "code.cdao.us/platform/rds-postgres/aws"
  version = "0.1.23"

  name = "marketplace-postgres"

  engine_version = "16.8"

  master_password = random_password.master_password.result

  vpc_id  = data.aws_vpc.tenant.id
  subnets = data.aws_subnets.db.ids

  ingress_cidr_blocks = local.subnet_cidr_blocks

  instance_class = "db.m5.large"
  instance_count = 1

  allocated_storage = 40

  storage_type = "gp3"
  iops         = 3000

  deletion_protection = true
  apply_immediately   = true
}

output "marketplace_db_intance_address" {
  value = module.marketplace_db.instance_address
}

output "marketplace_db_master_username" {
  value = module.marketplace_db.instance_username
}

output "marketplace_db_master_password" {
  value = module.marketplace_db.instance_password
}