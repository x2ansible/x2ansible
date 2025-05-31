package 'nginx'

template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  notifies :restart, 'service[nginx]'
end

service 'nginx' do
  action [:enable, :start]
end
