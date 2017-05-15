import React from 'react';
import style from './App.less';
import Wrap from './Wrap';
export default () => {
  return (
    <div>
      <h1 className={style.title}>
        Hello World
      </h1>
      <Wrap/>
    </div>
  );
};
