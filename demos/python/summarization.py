from keras.models import model_from_json
import pandas as pd
import numpy as np

loaded_model = None

# import os
# print(os.listdir(os.getcwd()))

# 저장된 JSON 파일로 부터 모델 로드하기
with open("./demos/python/model.json", "r") as f:
	loaded_model = model_from_json(f.read())
# 로드한 모델에 Weight 로드하기
loaded_model.load_weights("./demos/python/model.h5")
# 모델 컴파일 후 Evaluation
loaded_model.compile(loss="binary_crossentropy", optimizer="adam", metrics=['accuracy'])


# with open("./demos/python/hello.txt", "w") as f:
# 	f.write("시발")


print("파이썬 코드 실행완료")

# 데이터 불러오기










# model evaluation
# score = loaded_model.evaluate(X_test,y_test,verbose=0)
# print("%s : %.2f%%" % (loaded_model.metrics_names[1], score[1]*100))