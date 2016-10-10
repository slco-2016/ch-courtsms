import sys
import json 
import re 


import sys
import fileinput
import os

classes = ['owner', 'supervisor']

def processData(data, fileName):
    data = data.replace("function (req, res) {", "(req, res) => {")
    data = re.sub(r"(router\.(get|post)\(\")", r"\1/" + fileName, data)
    data = data.replace("primaryUser", "primary")
    data = data.replace("ownerUser", "owner")
    data = data.replace("supervisorUser", "supervisor")
    data = data.replace("req.params.userID", "req.user.cmid")
    data = data.replace("req.params.orgID", "req.user.org")
    data = data.replace("var ", "let ")
    data = data.replace("const ", "let ")
    data = data.replace('${req.redirectUrlBase}', "/v4")
    return data

for className in classes:
    d = './routes/versionFour/roles/%s/' % className

    for subdir, dirs, files in os.walk(d):
        for file in files:
            fileName, file_extension = os.path.splitext(file)
            if file_extension == '.js':
              path = os.path.join(subdir, file)

              with open(path) as f:
                data = f.read()

              with open(path, 'w') as f:
                data = processData(data, fileName)
                print data
                f.write(data)

# data = sys.stdin.read().strip()


# print data

# cat ./routes/versionFour/roles/primary/templates.js | python routes-replace.py templates