variable "vpc_name" {
  type = string
  default = "tenant_vpc"
}

variable "additional_cidrs" {
  type = list(string)
  description = "Additional CIDRs to add to pass to the module"
}