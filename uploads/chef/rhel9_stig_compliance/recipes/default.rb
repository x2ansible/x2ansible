# Enforce STIG compliance
include_recipe 'stig::default'

# Create local users
node['users'].each do |u|
  users_manage u do
    action [:create]
    data_bag 'users'
  end
end

# Block remote/AD/LDAP logins
%w[sssd oddjobd winbind].each do |svc|
  service svc do
    action [:disable, :stop]
  end
end

# Disable remote auth in /etc/nsswitch.conf
ruby_block 'Disable remote auth in nsswitch.conf' do
  block do
    fe = Chef::Util::FileEdit.new('/etc/nsswitch.conf')
    fe.search_file_replace_line(/^passwd:/, 'passwd:     files')
    fe.search_file_replace_line(/^group:/, 'group:      files')
    fe.write_file
  end
end

# Restrict sshd_config to local users only
ruby_block 'Restrict sshd_config to local users only' do
  block do
    fe = Chef::Util::FileEdit.new('/etc/ssh/sshd_config')
    fe.insert_line_if_no_match(/^AllowUsers/, 'AllowUsers admin developer clouduser student')
    fe.write_file
  end
end

# System update every 90 days with reboot
cron 'quarterly_system_update' do
  minute '0'
  hour '2'
  day '1'
  month '*/3'
  user 'root'
  command 'yum update -y && /sbin/reboot'
end

# Enable and configure yum-cron for security updates
include_recipe 'yum-cron::default'
