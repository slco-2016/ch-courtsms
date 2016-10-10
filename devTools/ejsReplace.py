import sys
import fileinput
import os

d = './views/v4/'

for subdir, dirs, files in os.walk(d):
    for file in files:
        filename, file_extension = os.path.splitext(file)
        
        if file_extension == '.ejs':
          path = os.path.join(subdir, file)

          with open(path) as f:
            data = f.read()

          with open(path, 'w') as f:
            print data
            data = data.strip()
            data = data.replace("users/<%=user.cmid%>/owner/", "")
            data = data.replace("users/<%=user.cmid%>/supervisor/", "")
            data = data.replace("users/<%=user.cmid%>/primary/", "")
            data = data.replace("${baseURL}", "/v4")
            data = data.replace("/v4/clients/client", "/v4/clients")
            f.write(data)