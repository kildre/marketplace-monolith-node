region               = "us-gov-west-1"
bucket               = "terraform-231134345536-test-blue"
key                  = "terraform.tfstate"
workspace_key_prefix = "tf-screen-next"
use_lockfile         = true
assume_role          = { role_arn = "arn:aws-us-gov:iam::231134345536:role/GitOpsServiceRole" }

# dynamodb_table       = "terraform-state"
