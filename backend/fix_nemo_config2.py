import tarfile
import os
import yaml
import shutil

nemo_path = 'models/indicconformer/model.nemo'
fixed_nemo_path = 'models/indicconformer/model_fixed2.nemo'
temp_dir = 'models/indicconformer/temp_extract2'

print("Extracting...")
os.makedirs(temp_dir, exist_ok=True)
with tarfile.open(nemo_path, 'r') as t:
    t.extractall(temp_dir)

config_path = os.path.join(temp_dir, 'model_config.yaml')
print("Fixing config...")
with open(config_path, 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# Remove problematic keys from decoder
if 'decoder' in config and isinstance(config['decoder'], dict):
    config['decoder'].pop('multisoftmax', None)

# Remove problematic keys from joint
if 'joint' in config and isinstance(config['joint'], dict):
    config['joint'].pop('multilingual', None)
    config['joint'].pop('language_keys', None)

with open(config_path, 'w', encoding='utf-8') as f:
    yaml.dump(config, f, allow_unicode=True, sort_keys=False)

print("Repackaging...")
with tarfile.open(fixed_nemo_path, 'w') as t:
    for filename in os.listdir(temp_dir):
        t.add(os.path.join(temp_dir, filename), arcname=f"./{filename}")

print("Replacing original model...")
os.replace(fixed_nemo_path, nemo_path)
shutil.rmtree(temp_dir)
print("Done!")
