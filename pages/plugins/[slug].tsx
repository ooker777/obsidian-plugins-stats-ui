
import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Navbar, { itemClasses } from '../../components/Navbar';

import { PrismaClient } from "@prisma/client";
import Link from 'next/link';
import moment from 'moment';
import showdown from 'showdown';
import Footer from '../../components/Footer';
import { setupFavorites } from '../../utils/favorites';
import Favorites from '../../components/Favorites';
import NewPluginCard from '../../components/NewPluginCard';
import { tagDenyList } from '../../utils/plugins';
import { isNotXDaysOld } from '../../utils/datetime';

const Tag = (props) => {
  const mdConverter = new showdown.Converter();
  mdConverter.setFlavor('github');

  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setupFavorites(setFavorites);
  }, []);

  const isFavorite = favorites.includes(props.plugin.pluginId);
  const isNotADayOld = isNotXDaysOld(props.plugin.createdAt, 1);
  return (
    <div>
      <Header />
      <Navbar current={`tag:${props.plugin.pluginId}`}>
        <div>|</div>
        <Link href={`/tags/${props.plugin.pluginId}`}>
          <a className={itemClasses('plugin', 'plugin')}>{`plugin:${props.plugin.pluginId}`}</a>
        </Link>
      </Navbar>
      <div className='bg-violet-50 pt-5'>
        <div className='pb-5 container w-full lg:w-1/2 mx-auto'>
          <div className='flex-col bg-gray-50 pb-3'>
            <div className={`text-2xl py-5 px-5 uppercase ${isFavorite ? 'bg-violet-100' : 'bg-gray-50'} mb-2`}>
              <span>🔗</span> {props.plugin.name}
            </div>
            <div className='px-5'>
              <div className='flex mb-2'>
                {props.tags?.map(tag => {
                  return (
                    <div key={tag} className='mr-1 px-2 text-sm bg-violet-200 rounded-xl'>
                      <Link href={`/tags/${tag}`}>
                        <a>{tag}</a>
                      </Link>
                    </div>
                  );
                })}
              </div>
              {isFavorite && <div className='cursor-default' title='Favorite plugin'>🤩</div>}
              {isNotADayOld && <div className='cursor-default' title='Less than a day old'>🥳</div>}
              {props.plugin.zScoreTrending > 10 && <div className='cursor-default' title='Trending plugin'>🔥</div>}
              <Favorites plugin={props.plugin} isFavorite={isFavorite} setFavorites={setFavorites} />
              <div>
                by <span>{props.plugin.author}</span>
              </div>
              <div className='mt-2 text-lg'>Description</div>
              <blockquote>{props.plugin.description}</blockquote>
              <div className='mt-2'>
                Repo: <a className='hover:underline text-violet-700' href={`https://github.com/${props.plugin.repo}`} target='_blank' rel="noreferrer">{props.plugin.repo}</a>
              </div>
              <div className='flex'>
                <div>⭐ {props.plugin.stargazers}</div>
                <div className='mx-5'>⬇️  {props.plugin.totalDownloads.toLocaleString("en-US")}</div>
              </div>
              <div className='flex-col border border-violet-900 my-2 p-2'>
                <div className='text-lg'>Latest Version</div>
                <div className='flex'>
                  <div className='mr-2 text-violet-700'>
                    <a className='hover:underline' href={`https://github.com/${props.plugin.repo}/releases/tag/${props.plugin.latestRelease}`} target='_blank' rel='noreferrer'>{props.plugin.latestRelease}</a>
                  </div>
                  <div>{moment(props.plugin.latestReleaseAt).fromNow()}</div>
                </div>
                <div className='mt-2'>Changelog</div>
                <div dangerouslySetInnerHTML={{__html: mdConverter.makeHtml(props.plugin.latestReleaseDesc)}} />
                <div className='mt-5'>
                  <a className='hover:underline text-violet-700' href={`https://github.com/${props.plugin.repo}/releases`} target='_blank' rel='noreferrer'>See all version on GitHub</a>
                </div>
              </div>
            </div>
          </div>
          { props.similarPlugins?.length > 0 && 
            <>
              <div className='mt-5 text-xl uppercase bg-violet-50'>💡 Similar Plugins</div>
              <details className='ml-2 text-sm'>
                <summary>info</summary>
                <div className='ml-3'>
                  • Similar plugins are suggested based on the common tags between the plugins.
                </div>
              </details> 
              <div className='flex flex-wrap bg-violet-50'>
                  {props.similarPlugins.map(plugin => 
                      <NewPluginCard key={plugin.pluginId} plugin={plugin} isFavorite={favorites.includes(plugin.pluginId)} isTrending={plugin.zScoreTrending > 10} />)}
              </div>
            </>
          }
        </div>
      </div>
      <Footer />
    </div>
  )
}

const prisma = new PrismaClient();

export const getStaticPaths = async () => {
  const plugins = await prisma.plugin.findMany({
    select: { pluginId: true }
  });

  return {
    paths: Array.from(plugins).map(plugin => ({params: {slug: plugin.pluginId}})),
    fallback: false,
  }
};

export const getStaticProps = async ({ params }) => {
  const tagsData = await prisma.pluginTags.findMany({
    where: { pluginId: params.slug }
  });
  const tags = tagsData.map(row => row.tag);
  
  const plugin = await prisma.plugin.findFirst({
    where: { pluginId: params.slug }
  });
  
  const pluginIdsInTags = await prisma.pluginTags.findMany({
    where: {
      tag: {
        in: tags.filter(tag => !tagDenyList.includes(tag))
      },
      pluginId: {
        not: plugin.pluginId
      }
    },
    select: { pluginId: true },
    distinct: ['pluginId']
  });
  
  const similarPlugins = await prisma.plugin.findMany({
    where: {
      pluginId: {
        in: pluginIdsInTags.map(pluginIdsInTag => pluginIdsInTag.pluginId)
      }
    },
  });
  
  return {
    props: {
      plugin,
      tags: tags,
      similarPlugins,
    }
  }
};

export default Tag;
