define mysql::db (
  ) {
	include mysql::server

	exec {"create-${name}-db":
		unless => "/usr/bin/mysql -uroot ${name}",
		command => "/usr/bin/mysql -uroot -e \"create database ${name}\"",
		require => Service["mysql"],
	}
}