package 'httpd' do
  action :install
end

service 'httpd' do
  action [:enable, :start]
end

template '/var/www/html/index.html' do
  source 'index.html.erb'
  mode '0644'
  owner 'root'
  group 'root'
  variables({
    message: 'Welcome to Chef-managed Apache!'
  })
end

service 'httpd' do
  action :start
end
