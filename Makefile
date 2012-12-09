app_dir = ~/test
deployment_hostname = pig-ubuntu.cloudapp.net

deploy :
	rsync -r . $(deployment_hostname):$(app_dir)
	ssh $(deployment_hostname) "cd $(app_dir); npm install"
	ssh $(deployment_hostname) "(sudo stop -q server > /dev/null 2>&1; sudo start -q server)"
