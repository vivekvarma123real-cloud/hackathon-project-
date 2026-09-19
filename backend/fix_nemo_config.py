import tarfile
import os
import yaml
import shutil

nemo_path = 'models/indicconformer/model.nemo'
fixed_nemo_path = 'models/indicconformer/model_fixed.nemo'
temp_dir = 'models/indicconformer/temp_extract'

print("Extracting...")
os.makedirs(temp_dir, exist_ok=True)
with tarfile.open(nemo_path, 'r') as t:
    t.extractall(temp_dir)

config_path = os.path.join(temp_dir, 'model_config.yaml')
print("Fixing config...")
with open(config_path, 'r', encoding='utf-8') as f:
    config_text = f.read()

# The error is: TypeError("RNNTDecoder.__init__() got an unexpected keyword argument 'multisoftmax'")
# So we need to remove `multisoftmax: true` or `multisoftmax: false` from the config
new_config_text = "\n".join([line for line in config_text.split('\n') if 'multisoftmax' not in line])

with open(config_path, 'w', encoding='utf-8') as f:
    f.write(new_config_text)

print("Repackaging...")
with tarfile.open(fixed_nemo_path, 'w') as t:
    for filename in os.listdir(temp_dir):
        t.add(os.path.join(temp_dir, filename), arcname=f"./{filename}")

print("Replacing original model...")
os.replace(fixed_nemo_path, nemo_path)
shutil.rmtree(temp_dir)
print("Done!")
