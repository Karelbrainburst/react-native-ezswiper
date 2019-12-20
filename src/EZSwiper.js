import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  InteractionManager,
} from 'react-native';

export default class EZSwiper extends Component<{}> {
  /**
     | -------------------------------------------------------
     | EZSwiper component life
     | -------------------------------------------------------
     */
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    offset: PropTypes.number,
    index: PropTypes.number,
    horizontal: PropTypes.bool,
    loop: PropTypes.bool,
    ratio: PropTypes.number,
    autoplayTimeout: PropTypes.number,
    autoplayDirection: PropTypes.bool,
    cardParams: PropTypes.object,

    renderRow: PropTypes.func.isRequired,
    onPress: PropTypes.func,
    onWillChange: PropTypes.func,
    onDidChange: PropTypes.func,
  };

  static defaultProps = {
    offset: 0,
    index: 0,
    horizontal: true,
    loop: true,
    ratio: 1,
    autoplayTimeout: 5,
    autoplayDirection: true,
    cardParams: {},
  };

  constructor(props) {
    //定义参数
    super(props);

    this.refScrollView = this.refScrollView.bind(this);
    this.getRenderRowViews = this.getRenderRowViews.bind(this);
    this.updateAnimated = this.updateAnimated.bind(this);
    this.autoPlay = this.autoPlay.bind(this);
    this.stopAutoPlay = this.stopAutoPlay.bind(this);

    const {
      dataSource,
      width,
      height,
      horizontal,
      offset,
      index,
      loop,
      ratio,
      autoplayTimeout,
      autoplayDirection,
      cardParams,
    } = this.props;

    const side = horizontal ? width : height;
    const cardSide = cardParams.cardSide || side * ratio * 0.4;
    const cardScale = cardParams.cardSmallSide
      ? (cardParams.cardSmallSide / (horizontal ? height : width)) * 0.4
      : ratio * 0.4;
    this.ezswiper = {
      horizontal: horizontal,
      scrollToDirection: horizontal ? 'x' : 'y', //滚动方向
      side: side, //尺寸
      ratio: ratio, //比例
      cardParams: {
        cardSide: cardSide,
        cardScale: cardScale,
        cardTranslate: cardParams.cardSpace
          ? (side - cardSide + side * (1 - cardScale)) / 2 -
            cardParams.cardSpace
          : ((side - cardSide + side * (1 - cardScale)) / 2) * 0.8,
      },
      dataSource: dataSource, //资源（icon）
      count: dataSource.length, //资源数量（条目数）
      currentIndex: index, //当前条目索引
      loop: loop, //是否循环
      autoplayTimeout: autoplayTimeout, //自动循环播放时间间隔
      autoplayDirection: autoplayDirection, //是否自动播放
      offset: offset,
    };

    this.scrollIndex = this.ezswiper.loop
      ? this.ezswiper.currentIndex + 1
      : this.ezswiper.currentIndex;
    //side: 360  cardSide: 312.12 cardScale: 0.867
    console.log(
      'side: ' + side,
      ' cardSide: ' +
        cardSide +
        ' cardScale: ' +
        cardScale +
        ' cardTranslate: ' +
        cardParams.cardSpace,
    );
    console.log(
      'p1: ' +
        ((side - cardSide + side * (1 - cardScale)) / 2 - cardParams.cardSpace),
    );
    const scaleArray = [];
    const translateArray = [];
    for (let i = 0; i < this.ezswiper.count + 2; i++) {
      scaleArray.push(new Animated.Value(1));
      translateArray.push(new Animated.Value(0));
    }
    this.state = {scaleArray, translateArray};

    this.events = {
      renderRow: this.renderRow.bind(this),
      onPress: this.onPress.bind(this),
      onWillChange: this.onWillChange.bind(this),
      onDidChange: this.onDidChange.bind(this),
    };
  }

  componentWillUnmount() {
    this.stopAutoPlay();
  }

  componentWillReceiveProps(nextProps) {
    //加载组件前
    if (JSON.stringify(nextProps) == JSON.stringify(this.props)) {
      return;
    }
    this.stopAutoPlay();
    const {
      dataSource,
      width,
      height,
      horizontal,
      offset,
      index,
      loop,
      ratio,
      autoplayTimeout,
      autoplayDirection,
      cardParams,
    } = nextProps;

    const side = horizontal ? width : height;
    const cardSide = cardParams.cardSide || side * ratio;
    const cardScale = cardParams.cardSmallSide
      ? cardParams.cardSmallSide / (horizontal ? height : width)
      : ratio * 0.6;
    this.ezswiper = {
      horizontal: horizontal,
      scrollToDirection: horizontal ? 'x' : 'y',
      side: side,
      ratio: ratio,
      cardParams: {
        cardSide: cardSide,
        cardScale: cardScale,
        cardTranslate: cardParams.cardSpace
          ? (side - cardSide + side * (1 - cardScale)) / 2 -
            cardParams.cardSpace
          : ((side - cardSide + side * (1 - cardScale)) / 2) * 0.8,
      },
      dataSource: dataSource,
      count: dataSource.length,
      currentIndex: index,
      loop: loop,
      autoplayTimeout: autoplayTimeout,
      autoplayDirection: autoplayDirection,
      offset: offset,
    };

    this.scrollIndex = this.ezswiper.loop
      ? this.ezswiper.currentIndex + 1
      : this.ezswiper.currentIndex;

    if (this.props.dataSource.length !== dataSource.length) {
      const scaleArray = [];
      const translateArray = [];
      for (let i = 0; i < this.ezswiper.count + 4; i++) {
        scaleArray.push(new Animated.Value(1));
        translateArray.push(new Animated.Value(0));
      }
      this.setState({scaleArray, translateArray});
    }
  }

  componentDidMount() {
    //加载组件完毕开始动画
    setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        this.scrollView &&
          this.scrollView.scrollTo({
            [this.ezswiper.scrollToDirection]:
              this.ezswiper.side * this.scrollIndex,
            animated: false,
          });
        this.updateAnimated(this.scrollIndex, this.scrollIndex);
        this.autoPlay(); //设置自动播放
        this.setState({initialized: true});
      });
    }, 100);
  }

  /**
     | -------------------------------------------------------
     | public api
     | -------------------------------------------------------
     */
  scrollTo(index, animated = true) {
    this.scrollView &&
      this.scrollView.scrollTo({
        [this.ezswiper.scrollToDirection]: this.ezswiper.side * index,
        animated: animated,
      });
  }

  /**
     | -------------------------------------------------------
     | private api
     | -------------------------------------------------------
     */
  //更新动画，根据当前索引位置对于scaleArray，translateArray赋值不同的伸缩参数
  updateAnimated(currentPageFloat, scrollIndex) {
    const {scaleArray, translateArray} = this.state;
    for (let i = 0; i < this.ezswiper.count + 2; i++) {
      if (i === scrollIndex) {
        //当前Index
        scaleArray[i].setValue(
          1 -
            Math.abs(currentPageFloat - scrollIndex) *
              (1 - this.ezswiper.cardParams.cardScale),
        );
        translateArray[i].setValue(
          this.ezswiper.cardParams.cardTranslate *
            (currentPageFloat - scrollIndex),
        );
      } else if (i === scrollIndex - 1 || i === scrollIndex + 1) {
        //左边，右边的Index
        // scaleArray[i].setValue((this.ezswiper.cardParams.cardScale + Math.abs(currentPageFloat - scrollIndex) * (1 - this.ezswiper.cardParams.cardScale)));
        scaleArray[i].setValue(0.8);
        // translateArray[i].setValue(((currentPageFloat - i) * this.ezswiper.cardParams.cardTranslate)*1.1);
        translateArray[i].setValue(
          (currentPageFloat - i) * this.ezswiper.cardParams.cardTranslate * 1.3,
        );
      } else {
        // scaleArray[i].setValue(this.ezswiper.cardParams.cardScale);
        scaleArray[i].setValue(this.ezswiper.cardParams.cardScale);
        translateArray[i].setValue(
          (currentPageFloat - i) * this.ezswiper.cardParams.cardTranslate,
        );
      }
    }
  }

  refScrollView(view) {
    this.scrollView = view;
  }

  autoPlay() {
    this.stopAutoPlay();
    if (!this.ezswiper.loop || !this.ezswiper.autoplayTimeout) {
      return;
    }

    this.autoPlayTimer = setTimeout(() => {
      this.scrollTo(
        this.scrollIndex + (this.ezswiper.autoplayDirection ? 1 : -1),
      );
    }, this.ezswiper.autoplayTimeout * 1000);
  }

  stopAutoPlay() {
    this.autoPlayTimer && clearTimeout(this.autoPlayTimer);
  }

  /**
     | -------------------------------------------------------
     | EZSwiper events 事件
     | -------------------------------------------------------
     */
  renderRow(obj, index) {
    if (typeof this.props.renderRow === 'function') {
      return this.props.renderRow(...arguments);
    }
  }

  onPress(obj, index) {
    if (typeof this.props.onPress === 'function') {
      return this.props.onPress(...arguments);
    }
  }

  onWillChange(obj, index) {
    if (typeof this.props.onWillChange === 'function') {
      return this.props.onWillChange(...arguments);
    }
  }

  onDidChange(obj, index) {
    if (typeof this.props.onDidChange === 'function') {
      return this.props.onDidChange(...arguments);
    }
  }
  /**
     | -------------------------------------------------------
     | ScrollView delegate
     | -------------------------------------------------------
     */
  onScroll(e) {
    if (this.scrollView) {
      this.stopAutoPlay();
      let offset = e.nativeEvent.contentOffset[this.ezswiper.scrollToDirection];
      if (this.ezswiper.loop) {
        if (
          Math.abs(offset - (this.ezswiper.count + 1) * this.ezswiper.side) <
          20.1
        ) {
          //当移动距离大于20.1，放手则执行向改方向移动
          offset = this.ezswiper.side;
          this.scrollView.scrollTo({
            [this.ezswiper.scrollToDirection]: offset,
            animated: false,
          });
        } else if (Math.abs(offset) < 20.1) {
          //少于20.1则退回来
          offset = this.ezswiper.side * this.ezswiper.count;
          this.scrollView.scrollTo({
            [this.ezswiper.scrollToDirection]: offset,
            animated: false,
          });
        }
      }

      let currentPageFloat = offset / this.ezswiper.side;
      const currentPageInt = currentPageFloat % 1;
      if (currentPageInt === 0 || currentPageInt >= 0.9) {
        // currentPageFloat = Math.ceil(currentPageFloat)
        this.willIndex = undefined;
        this.scrollIndex = Math.ceil(currentPageFloat);
        // this.autoPlay()
      }

      const willIndex = Math.round(currentPageFloat);
      if (this.willIndex === undefined && willIndex !== this.scrollIndex) {
        this.willIndex = willIndex;
        const dataSourceIndex = this.ezswiper.loop
          ? (this.willIndex + this.ezswiper.count - 1) % this.ezswiper.count
          : this.willIndex;
        this.onWillChange(
          this.ezswiper.dataSource[dataSourceIndex],
          dataSourceIndex,
        );
      }

      const oldIndex = this.ezswiper.currentIndex;
      this.ezswiper.currentIndex = this.ezswiper.loop
        ? (this.scrollIndex + this.ezswiper.count - 1) % this.ezswiper.count
        : this.scrollIndex;
      if (oldIndex !== this.ezswiper.currentIndex) {
        this.onDidChange(
          this.ezswiper.dataSource[this.ezswiper.currentIndex],
          this.ezswiper.currentIndex,
        );
      }

      this.updateAnimated(currentPageFloat, this.scrollIndex);
    }
  }

  /**
     | -------------------------------------------------------
     | Render
     | -------------------------------------------------------
     */
  getRenderRowViews() {
    const {scaleArray, translateArray} = this.state;
    const {width, height} = this.props;

    const count = this.ezswiper.count + (this.ezswiper.loop ? 2 : 0);
    const margin = (this.ezswiper.side - this.ezswiper.cardParams.cardSide) / 2;
    const views = [];
    const maxIndex = this.ezswiper.count - 1;

    for (let i = 0; i < count; i++) {
      const dataSourceIndex = this.ezswiper.loop
        ? (i + maxIndex) % this.ezswiper.count
        : i;
      const currentItem = this.ezswiper.dataSource[dataSourceIndex];
      console.log('currentItem: ' + currentItem);
      views.push(
        <View
          key={i}
          style={{flexDirection: this.ezswiper.horizontal ? 'row' : 'column'}}>
          <View
            style={{
              [this.ezswiper.horizontal ? 'width' : 'height']:
                margin + this.ezswiper.offset,
              backgroundColor: 'transparent',
            }}
          />
          <TouchableWithoutFeedback
            accessible={!!this.props.onPress}
            onPress={() => this.events.onPress(currentItem, dataSourceIndex)}>
            <Animated.View
              style={{
                backgroundColor: 'transparent',
                width: this.ezswiper.horizontal
                  ? this.ezswiper.cardParams.cardSide
                  : width,
                height: this.ezswiper.horizontal
                  ? height
                  : this.ezswiper.cardParams.cardSide,
                transform: [
                  {scaleY: scaleArray[i]},
                  {scaleX: scaleArray[i]},
                  {
                    [this.ezswiper.horizontal
                      ? 'translateX'
                      : 'translateY']: translateArray[i],
                  },
                ],
                // transform: [{ [this.ezswiper.horizontal ? 'scaleY' : 'scaleX']: 1 }, { [this.ezswiper.horizontal ? 'translateX' : 'translateY']: 1 }]
              }}>
              {this.events.renderRow(currentItem, dataSourceIndex)}
            </Animated.View>
          </TouchableWithoutFeedback>
          <View
            style={{
              [this.ezswiper.horizontal ? 'width' : 'height']:
                margin - this.ezswiper.offset,
              backgroundColor: 'transparent',
            }}
          />
        </View>,
      );
    }
    return views;
  }

  render() {
    const {width, height} = this.props;
    return (
      <View style={[this.props.style, {overflow: 'hidden'}]}>
        <ScrollView
          style={{
            backgroundColor: 'transparent',
            opacity: this.state.initialized ? 1 : 0,
          }}
          horizontal={this.ezswiper.horizontal}
          pagingEnabled
          ref={this.refScrollView}
          onScroll={e => this.onScroll(e)}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onLayout={event => {
            // event.nativeEvent.layout.width
          }}>
          {this.getRenderRowViews()}
        </ScrollView>
      </View>
    );
  }
}
