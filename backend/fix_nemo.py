import tarfile
import yaml
import os
import shutil
import tempfile

nemo_path = 'models/indicconformer/model_orig.nemo'
fixed_nemo_path = 'models/indicconformer/model.nemo'

def fix_nemo(model_path, out_path):
    print("Extracting...")
    temp_dir = tempfile.mkdtemp()
    with tarfile.open(model_path, 'r:') as tar:
        tar.extractall(path=temp_dir)
        
    config_path = os.path.join(temp_dir, 'model_config.yaml')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
        
    # Fix tokenizer type
    if 'tokenizer' in config:
        if config['tokenizer'].get('type') == 'multilingual':
            config['tokenizer']['type'] = 'agg'
            print("Fixed: Changed tokenizer type to 'agg'")
            
    # Recursive search and remove for unwanted keys
    def remove_key(d, key_to_remove):
        if isinstance(d, dict):
            if key_to_remove in d:
                del d[key_to_remove]
                print(f"Removed {key_to_remove}")
            for k, list_or_dict in list(d.items()):
                remove_key(list_or_dict, key_to_remove)
        elif isinstance(d, list):
            for item in d:
                remove_key(item, key_to_remove)
                
    remove_key(config, 'multisoftmax')
    remove_key(config, 'language_keys')
    remove_key(config, 'multilingual')

    with open(config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False)
        
    print("Repacking...")
    with tarfile.open(out_path, 'w:') as tar:
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, temp_dir)
                tar.add(full_path, arcname=arcname)
                
    shutil.rmtree(temp_dir)
    print("Done. Saved to", out_path)

fix_nemo(nemo_path, fixed_nemo_path)
