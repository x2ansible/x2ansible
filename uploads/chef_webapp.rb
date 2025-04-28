%w(httpd git curl).each do |pkg|
  package pkg do
    action :install
  end
end

template '/etc/httpd/conf.d/webapp.conf' do
  source 'webapp.conf.erb'
  owner 'root'
  group 'root'
  mode '0644'
end

service 'httpd' do
  action [:enable, :start]
end

execute 'create_redhat_banner' do
  command 'echo "Welcome to Red Hat WebApp" > /etc/motd'
  not_if { ::File.exist?('/etc/motd') }
end
