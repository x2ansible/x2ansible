# Cookbook Name:: complex_example
# Recipe:: default

# Install a list of packages
%w(vim git curl httpd mysql-server).each do |pkg|
    package pkg do
      action :install
    end
  end
  
  # Create a user if not present
  user 'deploy' do
    comment 'Deployment User'
    shell '/bin/bash'
    home '/home/deploy'
    manage_home true
    action :create
    not_if "id deploy"
  end
  
  # Set up a configuration file from a template with variables
  template '/etc/myapp.conf' do
    source 'myapp.conf.erb'
    variables(
      db_host: node['myapp']['db_host'],
      db_user: node['myapp']['db_user']
    )
    notifies :restart, 'service[myapp]', :delayed
  end
  
  # Use a data bag for secrets
  db_password = data_bag_item('secrets', 'db')['password']
  
  # Render a secrets file
  file '/etc/myapp_secrets' do
    content "db_password=#{db_password}"
    owner 'root'
    group 'root'
    mode '0600'
  end
  
  # Enable and start multiple services
  %w(httpd mysqld myapp).each do |svc|
    service svc do
      action [:enable, :start]
      subscribes :restart, "template[/etc/myapp.conf]", :delayed
    end
  end
  
  # Conditional logic example
  if node['platform'] == 'redhat'
    execute 'custom_redhat_command' do
      command 'echo "This is Red Hat" > /etc/redhat_message'
      not_if { ::File.exist?('/etc/redhat_message') }
    end
  end
  