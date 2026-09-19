import os
import urllib.request
import sys

URL = "https://objectstore.e2enetworks.net/indicconformer/models/indicconformer_stt_hi_hybrid_rnnt_large.nemo"

def download_model():
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "indicconformer")
    os.makedirs(model_dir, exist_ok=True)
    
    file_path = os.path.join(model_dir, "model.nemo")
    if os.path.exists(file_path):
        print(f"Model already exists at {file_path}")
        return

    print(f"Downloading model from {URL} to {file_path}...")
    print("This might take a while depending on your internet connection.")
    
    def reporthook(blocknum, blocksize, totalsize):
        readsofar = blocknum * blocksize
        if totalsize > 0:
            percent = readsofar * 1e2 / totalsize
            s = "\r%5.1f%% %*d / %d" % (percent, len(str(totalsize)), readsofar, totalsize)
            sys.stderr.write(s)
            if readsofar >= totalsize:
                sys.stderr.write("\n")
        else:
            sys.stderr.write("read %d\n" % (readsofar,))

    try:
        urllib.request.urlretrieve(URL, file_path, reporthook)
        print("Download complete!")
    except Exception as e:
        print(f"Error downloading model: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    download_model()
