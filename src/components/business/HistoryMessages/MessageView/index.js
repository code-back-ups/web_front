import React, {Component} from 'react'
import PropTypes from "prop-types"
import {Divider, Empty} from 'antd'
import _ from 'lodash'
import InfiniteScroller from 'components/InfiniteScroller/index'
import helper from 'utils/helper'
import Loading from '../Loading'
import ImageViewer from '../ImageViewer'
import VideoViewer from '../VideoViewer'
import config from 'common/config'
import util from '../util'
import {MessageTypes, messageComponentsMap, MessageLimit, DefaultItemHeight} from '../config'
import styles from './index.less'

const {DefaultAvatar} = config
const defaultHeight = 500

export default class MessageView extends Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    static propTypes = {
        onFetch: PropTypes.func.isRequired,
        renderEmpty: PropTypes.func,
        runwayItems: PropTypes.number,
        bottomFetchDistance: PropTypes.number,
        disableBottomFetch: PropTypes.bool,
        disableTopFetch: PropTypes.bool,
        useFetchLoading: PropTypes.bool,
        isScrollToBottom: PropTypes.bool,
        isContext: PropTypes.bool,
        onInfiniteScrollerChange: PropTypes.func,
        activeRecord: PropTypes.object,
    }

    static defaultProps = {
        renderEmpty: ()=> <Empty/>,
        runwayItems: MessageLimit,
        bottomFetchDistance: 10,
        disableBottomFetch: false,
        disableTopFetch: false,
        useFetchLoading: true,
        isScrollToBottom: false,
        isContext: false,
    }

    componentDidMount() {
        this.initScroll = true
    }

    componentWillUnmount() {
    }

    onImageClick = (url, uuid) => {
        this.imageViewer.showGallery(url, uuid)
    }

    onVideoClick = (url) => {
        this.videoViewer.handlePlay(url)
    }

    getContent = (item) => {
        const {keyword, activeRecord, audio} = this.props
        const option = {
            record: item,
            keyword: keyword,
            onImageClick: this.onImageClick,
            onVideoClick: this.onVideoClick,
            audio: audio,
            activeRecord: activeRecord,
            onImageLoad: this.loadImage
        }

        if (messageComponentsMap[item.type]) {
            return messageComponentsMap[item.type].createComponent(option)
        }
        // 默认文本类型
        return messageComponentsMap[MessageTypes.text].createComponent(option)
    }

    loadImage = (payload, callback) => {
        this.props.dispatch({
            type: 'messages/unload',
            payload: payload,
            callback: (data) => {
                callback && callback(data)
            }
        })
    }

    getAvatar = (item, active) => {
        return <img src={util.getAvatar(item, active)}
            className={styles.avatar}
            onError={(e) => {e.target.src = DefaultAvatar}}
            rel="noreferrer"
            alt=""
        />
    }

    getTime = (item) =>{
        return <div className={styles.time}>
            {helper.timestampFormat(this.getCreateTime(item))}
        </div>
    }

    getNickname = (item, active) => {
        return <div className={styles.nickname}>
            {util.getNickname(item, active)}
        </div>
    }

    getItemContent = (item) => {
        return <div className={styles.content}>
            {this.getContent(item)}
        </div>
    }

    getItem = (item, active) => {
        if (!item.is_sender && util.isNotification(item.type)) {
            return <div className={styles.noteItem}>
                {this.getContent(item)}
                {this.getTime(item)}
            </div>
        }

        if(item.is_sender) {
            return <div className={`${styles.item} ${styles.from} ${this.isActiveItem(item) ? styles.active : ''}`}>
                <div className={styles.mainBody}>
                    <div className={styles.top}>
                        {this.getTime(item)}
                        {this.getNickname(item, active)}
                    </div>
                    {this.getItemContent(item)}
                </div>
                {this.getAvatar(item, active)}
            </div>
        }
        return <div className={`${styles.item} ${styles.target} ${this.isActiveItem(item) ? styles.active : ''}`}>
            {this.getAvatar(item, active)}
            <div className={styles.mainBody}>
                <div className={styles.top}>
                    {this.getNickname(item, active)}
                    {this.getTime(item)}
                </div>
                {this.getItemContent(item)}
            </div>
        </div>
    }

    isActiveItem = (item) => {
        const {activeRecord, isContext} = this.props
        return !isContext && activeRecord && item.create_time === util.getCreateTime(activeRecord)
    }

    getCreateTime = (item) => {
        return item.create_time
    }

    scrollerItemContent = ({data, id}) => {
        const {activeSession} = this.props
        if (data.isExtra) {
            return <Divider className={styles.noMore}>无更多内容</Divider>
        }
        return <div key={id} className={styles.messageItem}>
            {this.getItem(data, activeSession)}
        </div>
    }

    onInfiniteScrollerChange = ({scrollToBottom, firstLoadCount, itemsLen}) => {
        const {onInfiniteScrollerChange, isScrollToBottom} = this.props
        if (onInfiniteScrollerChange && typeof onInfiniteScrollerChange === 'function') {
            onInfiniteScrollerChange(this.infiniteScrollerRef, firstLoadCount, itemsLen)
        } else {
            if (isScrollToBottom && this.initScroll && firstLoadCount === 0 && itemsLen > 0) {
                scrollToBottom()
                this.initScroll = false
            }
        }
    }

    infiniteScrollerForceUpdate = ()=>{
        this.infiniteScrollerRef.forceUpdateRenderItems()
    }

    infiniteScrollerRefresh = () => {
        this.initScroll = true
        this.infiniteScrollerRef.refresh()
    }

    getInfiniteScrollerRef = (node) => {
        this.infiniteScrollerRef = node
    }

    renderLoading = (loading) => {
        return <Loading loading={loading}/>
    }

    render() {
        const {onFetch, renderEmpty,
            useFetchLoading, runwayItems, bottomFetchDistance,
            disableBottomFetch, disableTopFetch,
            listHeight,
            images,
        } = this.props

        return (
            <div className={styles.messageView}>
                <div style={{height: listHeight || defaultHeight}}
                >
                    <InfiniteScroller
                        ref={this.getInfiniteScrollerRef}
                        fetchData={async ({type}) => {
                            return await onFetch(type)
                        }}
                        defaultItemHeight={DefaultItemHeight}
                        renderEmpty={renderEmpty}
                        runwayItems={runwayItems}
                        useFetchLoading={useFetchLoading}
                        bottomFetchDistance={bottomFetchDistance}
                        disableBottomFetch={disableBottomFetch}
                        disableTopFetch={disableTopFetch}
                        renderLoading={this.renderLoading}
                        onChange={this.onInfiniteScrollerChange}
                        scrollerItemContent={this.scrollerItemContent}
                        scrollOption={{
                            passive: true,
                        }}
                    />
                    <ImageViewer ref={(node)=>{this.imageViewer = node}} images={images}/>
                    <VideoViewer ref={(node)=>{this.videoViewer = node}}/>
                </div>
            </div>
        )
    }
}
