app_dir = ~/test
deployment_hostname = pig-ubuntu.cloudapp.net

deploy :
	rsync -r . $(deployment_hostname):$(app_dir)
	ssh $(deployment_hostname) "cd $(app_dir); npm install"
	ssh $(deployment_hostname) "cd $(app_dir); make start_app"	

start_app :
	sudo start --no-wait -q server
