terraform {
  # the backend config will be overwritten by the dragon pipeline task, but an s3 backend must be present
  backend "s3" {
    bucket               = "node-factory-terraform-091832198251"
    key                  = "path/of/your/project/project-name.tfstate"
    region               = "us-gov-west-1"
    workspace_key_prefix = "tenant"
  }
}
