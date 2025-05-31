package 'httpd' do
    action :install
  end
  
  template '/var/www/html/index.html' do
    source 'index.html.erb'
    owner 'root'
    group 'root'
    mode '0644'
    variables(message: 'Welcome to Chef-managed Apache!')
    notifies :restart, 'service[httpd]', :immediately
  end
  
  service 'httpd' do
    action [:enable, :start]
  end
  