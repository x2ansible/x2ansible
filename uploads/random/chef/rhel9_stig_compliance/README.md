# rhel9_stig_compliance

This Chef cookbook will:
- Enforce RHEL9 STIG compliance
- Create four local users (admin, developer, clouduser, student)
- Restrict logins to these local accounts only
- Configure automatic system updates every 90 days with reboot

## Usage
- Update data bag user password hashes and SSH keys.
- Upload cookbook and data bags to your Chef server or use Chef Solo.
- Add node to `rhel9_stig_compliance` run list.

## Requirements
- Chef Infra Client >= 16
- RHEL 9 system
- Internet access for cookbook dependencies

## Note
- This cookbook uses the community `stig` cookbook; verify it covers RHEL 9 and update as needed.
