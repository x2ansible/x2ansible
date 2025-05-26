# AWS S3 Bucket Creation with Versioning

## Creating S3 Bucket with Ansible

```yaml
- name: Create S3 bucket with versioning
  amazon.aws.s3_bucket:
    name: my-versioned-bucket
    versioning: yes
    state: present
    region: us-east-1
```

## Using AWS CLI
```bash
aws s3 mb s3://my-versioned-bucket
aws s3api put-bucket-versioning --bucket my-versioned-bucket --versioning-configuration Status=Enabled
```
