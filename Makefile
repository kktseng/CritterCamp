app_dir = ~/test
deployment_hostname = pigmaster@new-pig.cloudapp.net

deploy :
	rsync -r . $(deployment_hostname):$(app_dir)
	ssh $(deployment_hostname):$(app_dir)\; make install
	ssh $(deployment_hostname):$(app_dir)\; make start_app	

start_app :
	sudo start --no-wait -q server
